import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** List tests with attempt counts for Results hub */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const testId = searchParams.get("testId");
  const departmentId = searchParams.get("departmentId");

  let scopedCollegeId: string | undefined = collegeId ?? undefined;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId ?? undefined;
  }

  // Single test detail: all attempts
  if (testId) {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!test) return error("Test not found", 404);
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
            year: true,
            department: { select: { id: true, name: true, code: true } },
            college: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ percentage: "desc" }, { submittedAt: "desc" }],
    });

    // Optional department filter
    let rows = attempts;
    if (departmentId) {
      rows = attempts.filter((a) => a.student.department?.id === departmentId);
    }

    return json({
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
        };
      }),
    });
  }

  // Hub: list tests with result stats
  const where: any = {};
  if (scopedCollegeId) where.collegeId = scopedCollegeId;

  const tests = await prisma.test.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
  });

  const testIds = tests.map((t) => t.id);
  const attemptGroups = await prisma.testAttempt.groupBy({
    by: ["testId", "status"],
    where: {
      testId: { in: testIds },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
    },
    _count: { id: true },
    _avg: { percentage: true },
  });

  const statsMap: Record<string, { submitted: number; violated: number; avgPct: number }> = {};
  for (const g of attemptGroups) {
    if (!statsMap[g.testId]) statsMap[g.testId] = { submitted: 0, violated: 0, avgPct: 0 };
    if (g.status === "VIOLATED") statsMap[g.testId].violated += g._count.id;
    else {
      statsMap[g.testId].submitted += g._count.id;
      if (g._avg.percentage != null) statsMap[g.testId].avgPct = g._avg.percentage;
    }
  }

  return json(
    tests.map((t) => ({
      ...t,
      resultStats: statsMap[t.id] || { submitted: 0, violated: 0, avgPct: 0 },
    }))
  );
}
