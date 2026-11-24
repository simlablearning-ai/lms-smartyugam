import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** List tests (MCQ + TechAbility) with attempt counts for Results hub */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const testId = searchParams.get("testId");
  const departmentId = searchParams.get("departmentId");
  const kind = (searchParams.get("kind") || "").toUpperCase(); // MCQ | CODING | empty=all

  let scopedCollegeId: string | undefined = collegeId ?? undefined;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId ?? undefined;
  }

  // Single test detail: MCQ or TechAbility
  if (testId) {
    // Prefer MCQ unless kind=CODING
    if (kind !== "CODING") {
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: {
          college: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
          course: { select: { id: true, title: true } },
          _count: { select: { questions: true } },
        },
      });
      if (test) {
        if (
          auth.session!.user.role === Role.COLLEGE_ADMIN &&
          test.collegeId !== auth.session!.user.collegeId
        ) {
          return error("Forbidden", 403);
        }
        const attempts = await prisma.testAttempt.findMany({
          where: {
            testId,
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                year: true,
                department: { select: { id: true, name: true, code: true } },
                college: { select: { id: true, name: true, code: true } },
              },
            },
          },
          orderBy: [{ percentage: "desc" }, { submittedAt: "desc" }],
        });
        let rows = attempts;
        if (departmentId) {
          rows = attempts.filter((a) => a.student.department?.id === departmentId);
        }
        return json({
          kind: "MCQ",
          test,
          attempts: rows.map((a) => {
            let violationCount = 0;
            try {
              const v = a.violations ? JSON.parse(a.violations) : [];
              violationCount = Array.isArray(v) ? v.length : 0;
            } catch {
              violationCount = 0;
            }
            return {
              id: a.id,
              studentId: a.studentId,
              student: a.student,
              score: a.score,
              percentage: a.percentage,
              status: a.status,
              startedAt: a.startedAt,
              submittedAt: a.submittedAt,
              timeSpentSec: a.timeSpentSec,
              violationCount,
              ipAddress: a.ipAddress,
              kind: "MCQ",
            };
          }),
        });
      }
    }

    // TechAbility test
    const techTest = await prisma.techTest.findUnique({
      where: { id: testId },
      include: {
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { problems: true } },
      },
    });
    if (!techTest) return error("Test not found", 404);
    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      techTest.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const techAttempts = await prisma.techAttempt.findMany({
      where: {
        testId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            year: true,
            department: { select: { id: true, name: true, code: true } },
            college: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ percentage: "desc" }, { submittedAt: "desc" }],
    });

    let techRows = techAttempts;
    if (departmentId) {
      techRows = techAttempts.filter((a) => a.student.department?.id === departmentId);
    }

    return json({
      kind: "CODING",
      test: {
        ...techTest,
        // shape compatible with MCQ results UI
        _count: { questions: techTest._count.problems, problems: techTest._count.problems },
      },
      attempts: techRows.map((a) => {
        let violationCount = 0;
        try {
          const v = a.violations ? JSON.parse(a.violations) : [];
          violationCount = Array.isArray(v) ? v.length : 0;
        } catch {
          violationCount = 0;
        }
        return {
          id: a.id,
          studentId: a.studentId,
          student: a.student,
          score: a.score,
          percentage: a.percentage,
          status: a.status,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          timeSpentSec: a.timeSpentSec,
          violationCount,
          kind: "CODING",
        };
      }),
    });
  }

  // Hub: list MCQ + Tech tests with result stats
  const where: any = {};
  if (scopedCollegeId) where.collegeId = scopedCollegeId;

  const includeMcq = kind !== "CODING";
  const includeTech = kind !== "MCQ";

  const [mcqTests, techTests] = await Promise.all([
    includeMcq
      ? prisma.test.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            college: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { questions: true, attempts: true } },
          },
        })
      : Promise.resolve([]),
    includeTech
      ? prisma.techTest.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            college: { select: { id: true, name: true, code: true } },
            department: { select: { id: true, name: true, code: true } },
            _count: { select: { problems: true, attempts: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const mcqIds = mcqTests.map((t) => t.id);
  const techIds = techTests.map((t) => t.id);

  const [mcqGroups, techGroups] = await Promise.all([
    mcqIds.length
      ? prisma.testAttempt.groupBy({
          by: ["testId", "status"],
          where: {
            testId: { in: mcqIds },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
          },
          _count: { id: true },
          _avg: { percentage: true },
        })
      : Promise.resolve([]),
    techIds.length
      ? prisma.techAttempt.groupBy({
          by: ["testId", "status"],
          where: {
            testId: { in: techIds },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
          },
          _count: { id: true },
          _avg: { percentage: true },
        })
      : Promise.resolve([]),
  ]);

  const statsMap: Record<string, { submitted: number; violated: number; avgPct: number }> = {};
  for (const g of [...mcqGroups, ...techGroups]) {
    if (!statsMap[g.testId]) statsMap[g.testId] = { submitted: 0, violated: 0, avgPct: 0 };
    if (g.status === "VIOLATED") statsMap[g.testId].violated += g._count.id;
    else {
      statsMap[g.testId].submitted += g._count.id;
      if (g._avg.percentage != null) statsMap[g.testId].avgPct = g._avg.percentage;
    }
  }

  const hub = [
    ...mcqTests.map((t) => ({
      ...t,
      kind: "MCQ" as const,
      resultStats: statsMap[t.id] || { submitted: 0, violated: 0, avgPct: 0 },
    })),
    ...techTests.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      college: t.college,
      department: t.department,
      createdAt: t.createdAt,
      kind: "CODING" as const,
      _count: {
        questions: t._count.problems,
        problems: t._count.problems,
        attempts: t._count.attempts,
      },
      resultStats: statsMap[t.id] || { submitted: 0, violated: 0, avgPct: 0 },
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()
  );

  return json(hub);
}
