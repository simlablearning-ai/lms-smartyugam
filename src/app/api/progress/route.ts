import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/**
 * Student learning progress based on enrollments + test attempts.
 * GET ?studentId= (admin only) or current student session.
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  let studentId = searchParams.get("studentId");

  if (auth.session!.user.role === Role.STUDENT) {
    studentId = auth.session!.user.id;
  } else if (!studentId) {
    return error("studentId is required for admin");
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId! },
    select: {
      id: true,
      name: true,
      email: true,
      year: true,
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });

  if (!student) return error("Student not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    student.college?.id !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: studentId! },
    include: {
      course: {
        include: {
          tests: {
            where: { status: "PUBLISHED" },
            select: {
              id: true,
              title: true,
              totalMarks: true,
              passingMarks: true,
              durationMinutes: true,
            },
          },
          college: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const allTestIds = enrollments.flatMap((e) => e.course.tests.map((t) => t.id));

  const attempts = await prisma.testAttempt.findMany({
    where: {
      studentId: studentId!,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    },
    select: {
      id: true,
      testId: true,
      score: true,
      percentage: true,
      submittedAt: true,
      status: true,
      test: { select: { id: true, title: true, courseId: true, totalMarks: true, passingMarks: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // Recompute progress per enrollment from attempts on course tests
  const path = enrollments.map((e) => {
    const courseTests = e.course.tests;
    const courseAttempts = attempts.filter((a) =>
      courseTests.some((t) => t.id === a.testId)
    );
    // Best attempt per test
    const bestByTest = new Map<string, (typeof attempts)[0]>();
    for (const a of courseAttempts) {
      const prev = bestByTest.get(a.testId);
      if (!prev || (a.percentage || 0) > (prev.percentage || 0)) {
        bestByTest.set(a.testId, a);
      }
    }

    const totalTests = courseTests.length;
    let passed = 0;
    let sumPct = 0;
    const testProgress = courseTests.map((t) => {
      const best = bestByTest.get(t.id);
      const pct = best?.percentage ?? null;
      const passThreshold =
        t.totalMarks > 0 ? (t.passingMarks / t.totalMarks) * 100 : 40;
      const isPassed = pct != null && pct >= passThreshold;
      if (isPassed) passed++;
      if (pct != null) sumPct += pct;
      return {
        testId: t.id,
        title: t.title,
        percentage: pct,
        score: best?.score ?? null,
        passed: isPassed,
        attempted: !!best,
        submittedAt: best?.submittedAt ?? null,
      };
    });

    const progress =
      totalTests === 0
        ? e.progress
        : Math.round((passed / totalTests) * 100);
    const completed = totalTests > 0 && passed === totalTests;

    return {
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      completedAt: completed ? e.completedAt || new Date() : e.completedAt,
      progress,
      status: completed ? "completed" : progress > 0 || courseAttempts.length > 0 ? "ongoing" : "not_started",
      course: {
        id: e.course.id,
        title: e.course.title,
        code: e.course.code,
        description: e.course.description,
        passingScore: e.course.passingScore,
        college: e.course.college,
        department: e.course.department,
      },
      tests: testProgress,
      avgScore: testProgress.filter((t) => t.percentage != null).length
        ? sumPct / testProgress.filter((t) => t.percentage != null).length
        : null,
    };
  });

  // Also include attempts not tied to enrolled courses
  const enrolledTestIds = new Set(allTestIds);
  const otherAttempts = attempts.filter((a) => !enrolledTestIds.has(a.testId));

  const completed = path.filter((p) => p.status === "completed");
  const ongoing = path.filter((p) => p.status === "ongoing");
  const notStarted = path.filter((p) => p.status === "not_started");

  const scoredAttempts = attempts.filter((a) => a.percentage != null);
  const avgPercentage =
    scoredAttempts.length > 0
      ? scoredAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / scoredAttempts.length
      : 0;

  return json({
    student,
    summary: {
      totalCourses: path.length,
      completed: completed.length,
      ongoing: ongoing.length,
      notStarted: notStarted.length,
      totalAttempts: attempts.length,
      avgPercentage: Math.round(avgPercentage * 10) / 10,
    },
    path,
    completed,
    ongoing,
    notStarted,
    otherAttempts,
  });
}
