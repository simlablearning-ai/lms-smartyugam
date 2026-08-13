import { prisma } from "@/lib/prisma";
import { requireAuth, json } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** Unified calendar: tests + interviews for the current user */
export async function GET() {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const role = auth.session!.user.role;
  const userId = auth.session!.user.id;
  const collegeId = auth.session!.user.collegeId;
  const events: any[] = [];

  // Tests with a schedule
  const testWhere: any = {
    OR: [{ startTime: { not: null } }, { endTime: { not: null } }],
  };
  if ((role === Role.STUDENT || role === Role.COLLEGE_ADMIN) && collegeId) {
    testWhere.AND = [{ OR: [{ collegeId }, { collegeId: null }] }];
  }

  const tests = await prisma.test.findMany({
    where: testWhere,
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
            college: { select: { name: true } },
    },
    orderBy: { startTime: "asc" },
    take: 100,
  });

  for (const t of tests) {
    events.push({
      id: `test-${t.id}`,
      type: "TEST",
      title: t.title,
      subtitle: t.college?.name || "Assessment",
      start: t.startTime,
      end: t.endTime,
      link:
        role === Role.STUDENT
          ? `/student/tests`
          : role === Role.COLLEGE_ADMIN
          ? `/college-admin/tests`
          : `/super-admin/tests`,
    });
  }

  // Interviews for students / related apps for admins
  if (role === Role.STUDENT) {
    const apps = await prisma.jobApplication.findMany({
      where: {
        studentId: userId,
        OR: [{ interviewAt: { not: null } }, { status: "INTERVIEW" }],
      },
      include: {
        job: { select: { id: true, title: true, companyName: true } },
      },
    });
    for (const a of apps) {
      events.push({
        id: `interview-${a.id}`,
        type: "INTERVIEW",
        title: `Interview: ${a.job.title}`,
        subtitle: a.job.companyName + (a.interviewRound ? ` · ${a.interviewRound}` : ""),
        start: a.interviewAt,
        end: a.interviewAt
          ? new Date(new Date(a.interviewAt).getTime() + 60 * 60 * 1000).toISOString()
          : null,
        description: a.interviewInfo,
        link: `/student/placement`,
      });
    }
  } else {
    const appWhere: any = {
      OR: [{ interviewAt: { not: null } }, { status: "INTERVIEW" }],
    };
    if (role === Role.COLLEGE_ADMIN && collegeId) {
      appWhere.student = { collegeId };
    }
    const apps = await prisma.jobApplication.findMany({
      where: appWhere,
      include: {
        job: { select: { title: true, companyName: true } },
        student: { select: { name: true, email: true } },
      },
      take: 100,
      orderBy: { interviewAt: "asc" },
    });
    for (const a of apps) {
      events.push({
        id: `interview-${a.id}`,
        type: "INTERVIEW",
        title: `Interview: ${a.student.name}`,
        subtitle: `${a.job.title} · ${a.job.companyName}`,
        start: a.interviewAt,
        end: a.interviewAt
          ? new Date(new Date(a.interviewAt).getTime() + 60 * 60 * 1000).toISOString()
          : null,
        description: a.interviewInfo,
        link:
          role === Role.COLLEGE_ADMIN
            ? `/college-admin/placement`
            : `/super-admin/placement`,
      });
    }
  }

  events.sort((a, b) => {
    const ta = a.start ? new Date(a.start).getTime() : 0;
    const tb = b.start ? new Date(b.start).getTime() : 0;
    return ta - tb;
  });

  return json({ events });
}
