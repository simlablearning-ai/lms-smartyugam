import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.STUDENT, Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  let studentId = searchParams.get("studentId");

  if (auth.session!.user.role === Role.STUDENT) {
    studentId = auth.session!.user.id;
  }
  if (!studentId) return error("studentId required");

  const profile = await prisma.placementProfile.findUnique({
    where: { studentId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          year: true,
          department: { select: { id: true, name: true, code: true } },
          college: { select: { id: true, name: true, code: true } },
          enrollments: {
            include: { course: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });

  // Learning growth snapshot
  const attempts = await prisma.testAttempt.findMany({
    where: {
      studentId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    select: { percentage: true, test: { select: { title: true } }, submittedAt: true },
    orderBy: { submittedAt: "desc" },
    take: 10,
  });

  return json({
    profile,
    learning: {
      enrollments: profile?.student?.enrollments || [],
      recentAttempts: attempts,
      avgScore:
        attempts.length > 0
          ? Math.round(
              attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length
            )
          : null,
    },
  });
}

export async function PUT(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const studentId = auth.session!.user.id;
    const body = await req.json();
    const {
      headline,
      summary,
      phone,
      location,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      resumeUrl,
      skills,
      education,
      experience,
      cgpa,
      backlogs,
    } = body;

    const skillsStr = Array.isArray(skills) ? skills.join(", ") : skills || null;
    const educationStr =
      typeof education === "object" ? JSON.stringify(education) : education || null;
    const experienceStr =
      typeof experience === "object" ? JSON.stringify(experience) : experience || null;

    const isComplete = Boolean(
      (headline || summary) &&
        skillsStr &&
        (resumeUrl || linkedinUrl) &&
        (phone || location)
    );

    const profile = await prisma.placementProfile.upsert({
      where: { studentId },
      create: {
        studentId,
        headline: headline || null,
        summary: summary || null,
        phone: phone || null,
        location: location || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        resumeUrl: resumeUrl || null,
        skills: skillsStr,
        education: educationStr,
        experience: experienceStr,
        cgpa: cgpa != null && cgpa !== "" ? parseFloat(cgpa) : null,
        backlogs: backlogs != null ? parseInt(backlogs) : 0,
        isComplete,
      },
      update: {
        headline: headline || null,
        summary: summary || null,
        phone: phone || null,
        location: location || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        resumeUrl: resumeUrl || null,
        skills: skillsStr,
        education: educationStr,
        experience: experienceStr,
        cgpa: cgpa != null && cgpa !== "" ? parseFloat(cgpa) : null,
        backlogs: backlogs != null ? parseInt(backlogs) : 0,
        isComplete,
      },
    });

    return json(profile);
  } catch (e: any) {
    return error(e.message || "Failed to save profile", 500);
  }
}
