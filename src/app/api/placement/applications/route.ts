import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

function skillList(s?: string | null): string[] {
  if (!s) return [];
  return s
    .split(/[,|]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const studentId = auth.session!.user.id;
    const body = await req.json();
    const { jobId, appSkills, appResume, appHeadline, coverLetter, resumeFileName } = body;
    if (!jobId) return error("jobId required");

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job || job.status !== "OPEN") return error("Job is not open for applications");

    if (job.applicationDeadline && new Date() > new Date(job.applicationDeadline)) {
      return error("Application deadline has passed");
    }

    const blocked = await prisma.placementBlock.findUnique({
      where: { jobId_studentId: { jobId, studentId } },
    });
    if (blocked) return error("You are restricted from applying to this job by your college");

    const profile = await prisma.placementProfile.findUnique({ where: { studentId } });
    if (!profile || !profile.isComplete) {
      return error("Complete your placement profile before applying");
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { year: true, department: { select: { code: true, name: true } } },
    });

    // Eligibility checks
    if (job.minCgpa != null && (profile.cgpa == null || profile.cgpa < job.minCgpa)) {
      return error(`Minimum CGPA required: ${job.minCgpa}`);
    }
    if (job.maxBacklogs != null && (profile.backlogs || 0) > job.maxBacklogs) {
      return error(`Maximum backlogs allowed: ${job.maxBacklogs}`);
    }
    if (job.eligibleYears) {
      const years = job.eligibleYears.split(",").map((y) => y.trim());
      if (student?.year && !years.includes(String(student.year))) {
        return error(`Eligible years: ${job.eligibleYears}`);
      }
    }
    if (job.eligibleDepts && student?.department) {
      const depts = job.eligibleDepts.split(",").map((d) => d.trim().toLowerCase());
      const code = (student.department.code || "").toLowerCase();
      const name = (student.department.name || "").toLowerCase();
      if (!depts.some((d) => d === code || name.includes(d))) {
        return error(`Eligible departments: ${job.eligibleDepts}`);
      }
    }

    // Skills match score — use application override if provided
    const required = skillList(job.skillsRequired);
    const effectiveSkills = (appSkills && String(appSkills).trim()) || profile.skills;
    const have = skillList(effectiveSkills);
    let match = 100;
    if (required.length) {
      const hit = required.filter((r) => have.some((h) => h.includes(r) || r.includes(h)));
      match = Math.round((hit.length / required.length) * 100);
      if (match < 40) {
        return error(
          `Profile skills do not match job requirements well enough (${match}% match). Update skills and try again.`
        );
      }
    }

    // Learning score boost
    const avg = await prisma.testAttempt.aggregate({
      where: { studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      _avg: { percentage: true },
    });
    const learningBoost = (avg._avg.percentage || 0) * 0.3;
    const score = Math.round(match * 0.7 + learningBoost);

    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_studentId: { jobId, studentId } },
    });
    if (existing) return error("You already applied to this job");

    const app = await prisma.jobApplication.create({
      data: {
        jobId,
        studentId,
        status: "APPLIED",
        score,
        appSkills: appSkills ? String(appSkills) : null,
        appResume: appResume ? String(appResume) : null,
        appHeadline: appHeadline ? String(appHeadline) : null,
        coverLetter: coverLetter ? String(coverLetter) : null,
        resumeFileName: resumeFileName ? String(resumeFileName) : null,
      },
    });

    return json({ ...app, skillsMatch: match }, 201);
  } catch (e: any) {
    return error(e.message || "Failed to apply", 500);
  }
}

export async function GET(req: Request) {
  const auth = await requireAuth([Role.STUDENT, Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const studentIdParam = searchParams.get("studentId");

  if (auth.session!.user.role === Role.STUDENT) {
    const apps = await prisma.jobApplication.findMany({
      where: { studentId: auth.session!.user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyName: true,
            location: true,
            status: true,
            packageLpa: true,
          },
        },
      },
      orderBy: { appliedAt: "desc" },
    });
    return json(apps);
  }

  // Admin: optional student filter for track record
  const where: any = {};
  if (studentIdParam) where.studentId = studentIdParam;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.student = { collegeId: auth.session!.user.collegeId };
  }

  const apps = await prisma.jobApplication.findMany({
    where,
    include: {
      job: { select: { id: true, title: true, companyName: true, status: true } },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          year: true,
          department: { select: { name: true, code: true } },
          college: { select: { name: true } },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
    take: 200,
  });

  return json(apps);
}
