import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { applications: true } },
    },
  });
  if (!job) return error("Job not found", 404);

  // Applicants for admin views
  if (auth.session!.user.role !== Role.STUDENT) {
    const applications = await prisma.jobApplication.findMany({
      where: { jobId: id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            year: true,
            department: { select: { name: true, code: true } },
            college: { select: { name: true, code: true } },
            placementProfile: true,
            enrollments: {
              select: { progress: true, course: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: [{ score: "desc" }, { appliedAt: "asc" }],
    });

    // Recent test averages for scoring context
    const studentIds = applications.map((a) => a.studentId);
    const attempts = await prisma.testAttempt.groupBy({
      by: ["studentId"],
      where: {
        studentId: { in: studentIds },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
      _avg: { percentage: true },
      _count: { id: true },
    });
    const avgMap = Object.fromEntries(
      attempts.map((a) => [a.studentId, { avg: a._avg.percentage, count: a._count.id }])
    );

    const blocks = await prisma.placementBlock.findMany({
      where: { jobId: id },
      select: { studentId: true, reason: true },
    });

    return json({
      job,
      applications: applications.map((a) => ({
        ...a,
        learningAvg: avgMap[a.studentId]?.avg ?? null,
        testsTaken: avgMap[a.studentId]?.count ?? 0,
      })),
      blocks,
    });
  }

  // Student: own application + blocked
  const studentId = auth.session!.user.id;
  const myApp = await prisma.jobApplication.findUnique({
    where: { jobId_studentId: { jobId: id, studentId } },
  });
  const blocked = await prisma.placementBlock.findUnique({
    where: { jobId_studentId: { jobId: id, studentId } },
  });

  return json({ job, myApplication: myApp, blocked: !!blocked });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const body = await req.json();
    const data: any = {};
    const fields = [
      "title",
      "companyName",
      "location",
      "jobType",
      "description",
      "requirements",
      "skillsRequired",
      "eligibleYears",
      "eligibleDepts",
      "status",
      "interviewNotes",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f] || null;
    }
    if (body.packageLpa !== undefined)
      data.packageLpa = body.packageLpa !== "" && body.packageLpa != null ? parseFloat(body.packageLpa) : null;
    if (body.minCgpa !== undefined)
      data.minCgpa = body.minCgpa !== "" && body.minCgpa != null ? parseFloat(body.minCgpa) : null;
    if (body.maxBacklogs !== undefined)
      data.maxBacklogs =
        body.maxBacklogs !== "" && body.maxBacklogs != null ? parseInt(body.maxBacklogs) : null;
    if (body.collegeId !== undefined) data.collegeId = body.collegeId || null;
    if (body.applicationDeadline !== undefined)
      data.applicationDeadline = body.applicationDeadline
        ? new Date(body.applicationDeadline)
        : null;

    const job = await prisma.jobPosting.update({ where: { id }, data });
    return json(job);
  } catch (e: any) {
    return error(e.message || "Update failed", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  await prisma.jobPosting.delete({ where: { id } });
  return json({ success: true });
}
