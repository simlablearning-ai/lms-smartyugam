import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { notifyUsers } from "@/lib/notify";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where: any = {};
  if (status) where.status = status;
  else if (auth.session!.user.role === Role.STUDENT) where.status = "OPEN";

  // College scoping: college admin sees all open + their college jobs
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    const cid = auth.session!.user.collegeId;
    where.OR = [{ collegeId: null }, { collegeId: cid }];
  }

  if (q) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { skillsRequired: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const jobs = await prisma.jobPosting.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { applications: true } },
    },
  });

  // For students: mark applied + blocked
  if (auth.session!.user.role === Role.STUDENT) {
    const studentId = auth.session!.user.id;
    const apps = await prisma.jobApplication.findMany({
      where: { studentId },
      select: { jobId: true, status: true },
    });
    const blocks = await prisma.placementBlock.findMany({
      where: { studentId },
      select: { jobId: true },
    });
    const appMap = Object.fromEntries(apps.map((a) => [a.jobId, a.status]));
    const blockSet = new Set(blocks.map((b) => b.jobId));
    return json(
      jobs.map((j) => ({
        ...j,
        myStatus: appMap[j.id] || null,
        blocked: blockSet.has(j.id),
      }))
    );
  }

  return json(jobs);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const {
      title,
      companyName,
      location,
      jobType,
      description,
      requirements,
      skillsRequired,
      packageLpa,
      minCgpa,
      maxBacklogs,
      eligibleYears,
      eligibleDepts,
      collegeId,
      status,
      applicationDeadline,
      interviewNotes,
    } = body;

    if (!title || !companyName) return error("Title and company name are required");

    const job = await prisma.jobPosting.create({
      data: {
        title,
        companyName,
        location: location || null,
        jobType: jobType || null,
        description: description || null,
        requirements: requirements || null,
        skillsRequired: skillsRequired || null,
        packageLpa: packageLpa != null && packageLpa !== "" ? parseFloat(packageLpa) : null,
        minCgpa: minCgpa != null && minCgpa !== "" ? parseFloat(minCgpa) : null,
        maxBacklogs: maxBacklogs != null && maxBacklogs !== "" ? parseInt(maxBacklogs) : null,
        eligibleYears: eligibleYears || null,
        eligibleDepts: eligibleDepts || null,
        collegeId: collegeId || null,
        status: status || "OPEN",
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        interviewNotes: interviewNotes || null,
        createdById: auth.session!.user.id,
      },
    });

    // Notify eligible students about new job
    try {
      if ((job.status || "OPEN") === "OPEN") {
        const studentWhere: any = { role: Role.STUDENT, isActive: true };
        if (job.collegeId) studentWhere.collegeId = job.collegeId;
        const students = await prisma.user.findMany({
          where: studentWhere,
          select: { id: true },
          take: 500,
        });
        await notifyUsers(
          students.map((s) => s.id),
          {
            title: `New job: ${job.title}`,
            body: `${job.companyName}${job.location ? " · " + job.location : ""}${job.packageLpa != null ? " · " + job.packageLpa + " LPA" : ""}. Open Placement to view and apply.`,
            type: "JOB",
            link: "/student/placement",
          }
        );
      }
    } catch (err) {
      console.error("job notify failed", err);
    }

    return json(job, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create job", 500);
  }
}
