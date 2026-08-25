import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/**
 * Reports for Super Admin / College Admin.
 * Shows all tests (any status) that match filters, with completed-attempt stats.
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");
  const testId = searchParams.get("testId");
  const view = searchParams.get("view") || "summary";

  let scopedCollegeId: string | undefined = collegeId || undefined;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId || undefined;
  }

  try {
    // Students matching filters (for student-level breakdown)
    const studentWhere: any = {
      role: Role.STUDENT,
      isActive: true,
    };
    if (scopedCollegeId) studentWhere.collegeId = scopedCollegeId;
    if (departmentId) studentWhere.departmentId = departmentId;
    if (year) studentWhere.year = parseInt(year, 10);

    const students = await prisma.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        year: true,
        department: { select: { id: true, name: true, code: true } },
        college: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    });

    // Tests: include ALL statuses so completed exams always appear
    // (Results page lists them; Reports must match)
    const testWhere: any = {};
    if (scopedCollegeId) testWhere.collegeId = scopedCollegeId;
    if (testId) {
      testWhere.id = testId;
    } else if (departmentId) {
      testWhere.OR = [{ departmentId }, { departmentId: null }];
    }

    let tests = await prisma.test.findMany({
      where: testWhere,
      select: {
        id: true,
        title: true,
        status: true,
        totalMarks: true,
        passingMarks: true,
        departmentId: true,
        collegeId: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        department: { select: { id: true, name: true, code: true } },
        college: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // If a specific testId was requested but not found under filters, still try by id
    // (avoids empty UI when dropdown shows the test but filters conflict)
    if (testId && tests.length === 0) {
      const one = await prisma.test.findUnique({
        where: { id: testId },
        select: {
          id: true,
          title: true,
          status: true,
          totalMarks: true,
          passingMarks: true,
          departmentId: true,
          collegeId: true,
          startTime: true,
          endTime: true,
          createdAt: true,
          department: { select: { id: true, name: true, code: true } },
          college: { select: { id: true, name: true, code: true } },
        },
      });
      if (one) {
        if (
          auth.session!.user.role === Role.COLLEGE_ADMIN &&
          one.collegeId !== auth.session!.user.collegeId
        ) {
          // forbidden
        } else {
          tests = [one];
        }
      }
    }

    const studentIds = students.map((s) => s.id);
    const testIds = tests.map((t) => t.id);

    // Load completed attempts for these tests
    // Prefer filtering by student set when year/dept filters apply;
    // if no students match filters, still show tests with zero rows.
    let attempts: {
      id: string;
      studentId: string;
      testId: string;
      score: number | null;
      percentage: number | null;
      submittedAt: Date | null;
      startedAt: Date;
      status: string;
      timeSpentSec: number | null;
    }[] = [];

    if (testIds.length > 0) {
      const attemptWhere: any = {
        testId: { in: testIds },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
      };
      // Only restrict by student when we have a student filter that returned IDs
      // Year/dept filter: restrict attempts to those students
      // No student filter fields: include all attempts on those tests
      const studentFilterActive = !!(departmentId || year);
      if (studentFilterActive) {
        if (studentIds.length > 0) {
          attemptWhere.studentId = { in: studentIds };
        } else {
          attemptWhere.studentId = { in: ["__none__"] };
        }
      } else if (scopedCollegeId && studentIds.length > 0) {
        // College scope: prefer students of that college (incl. inactive who already attempted)
        // Also include attempts from any student on these college tests
      }

      attempts = await prisma.testAttempt.findMany({
        where: attemptWhere,
        select: {
          id: true,
          studentId: true,
          testId: true,
          score: true,
          percentage: true,
          submittedAt: true,
          startedAt: true,
          status: true,
          timeSpentSec: true,
        },
      });

      // If college scoped and no year/dept filter, keep attempts tied to those tests
      // (already fetched). Optionally drop attempts from students outside college:
      if (scopedCollegeId && !studentFilterActive && studentIds.length > 0) {
        const allowed = new Set(studentIds);
        // Keep attempts whose student is in college OR we don't know — keep all for exam accuracy
        // Don't filter: deactivated students should still appear in exam stats
      }
    }

    // Ensure students who only appear via attempts are included when viewing a single test
    if (testId && attempts.length > 0) {
      const missingIds = [
        ...new Set(
          attempts
            .map((a) => a.studentId)
            .filter((id) => !studentIds.includes(id))
        ),
      ];
      if (missingIds.length) {
        const extra = await prisma.user.findMany({
          where: { id: { in: missingIds } },
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            year: true,
            department: { select: { id: true, name: true, code: true } },
            college: { select: { id: true, name: true, code: true } },
          },
        });
        students.push(...extra);
      }
    }

    const allStudents = students;
    const allStudentIds = allStudents.map((s) => s.id);

    const byTest = tests.map((test) => {
      const testAttempts = attempts.filter((a) => a.testId === test.id);
      const uniqueStudents = new Set(testAttempts.map((a) => a.studentId));
      const pcts = testAttempts
        .map((a) => a.percentage)
        .filter((p): p is number => p != null);
      const avg =
        pcts.length > 0 ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
      const passMark =
        test.totalMarks > 0
          ? (test.passingMarks / test.totalMarks) * 100
          : 40;
      const passed = testAttempts.filter(
        (a) => (a.percentage || 0) >= passMark && a.status !== "VIOLATED"
      ).length;
      return {
        test: {
          id: test.id,
          title: test.title,
          status: test.status,
          totalMarks: test.totalMarks,
          passingMarks: test.passingMarks,
          department: test.department,
          college: test.college,
          startTime: test.startTime,
          endTime: test.endTime,
        },
        attemptCount: testAttempts.length,
        studentCount: uniqueStudents.size,
        avgPercentage: avg != null ? Math.round(avg * 10) / 10 : null,
        passedCount: passed,
        passRate:
          testAttempts.length > 0
            ? Math.round((passed / testAttempts.length) * 1000) / 10
            : null,
      };
    });

    const studentReports = allStudents.map((student) => {
      const studentAttempts = attempts.filter((a) => a.studentId === student.id);
      const attended = studentAttempts.map((a) => {
        const test = tests.find((t) => t.id === a.testId);
        const passMark =
          test && test.totalMarks > 0
            ? (test.passingMarks / test.totalMarks) * 100
            : 40;
        return {
          testId: a.testId,
          testTitle: test?.title || "Unknown",
          score: a.score,
          percentage: a.percentage,
          totalMarks: test?.totalMarks,
          status: a.status,
          passed: a.status !== "VIOLATED" && (a.percentage || 0) >= passMark,
          submittedAt: a.submittedAt,
        };
      });

      const notAttended = tests
        .filter((t) => !studentAttempts.some((a) => a.testId === t.id))
        .map((t) => ({
          testId: t.id,
          testTitle: t.title,
          totalMarks: t.totalMarks,
        }));

      const avgPercentage =
        attended.length > 0
          ? attended.reduce((sum, a) => sum + (a.percentage || 0), 0) /
            attended.length
          : null;

      return {
        student,
        attended,
        notAttended,
        totalTests: tests.length,
        attendedCount: attended.length,
        notAttendedCount: notAttended.length,
        avgPercentage:
          avgPercentage != null ? Math.round(avgPercentage * 10) / 10 : null,
      };
    });

    const deptMap = new Map<
      string,
      { name: string; students: number; attempts: number; avgSum: number; avgCount: number }
    >();
    for (const sr of studentReports) {
      const deptId = sr.student.department?.id || "none";
      const deptName = sr.student.department?.name || "No Department";
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          name: deptName,
          students: 0,
          attempts: 0,
          avgSum: 0,
          avgCount: 0,
        });
      }
      const d = deptMap.get(deptId)!;
      d.students += 1;
      d.attempts += sr.attendedCount;
      if (sr.avgPercentage != null) {
        d.avgSum += sr.avgPercentage;
        d.avgCount += 1;
      }
    }
    const byDepartment = Array.from(deptMap.entries()).map(([id, d]) => ({
      departmentId: id,
      name: d.name,
      students: d.students,
      attempts: d.attempts,
      avgScore:
        d.avgCount > 0 ? Math.round((d.avgSum / d.avgCount) * 10) / 10 : null,
    }));

    const yearMap = new Map<
      number | string,
      { students: number; attempts: number; avgSum: number; avgCount: number }
    >();
    for (const sr of studentReports) {
      const y = sr.student.year ?? "N/A";
      if (!yearMap.has(y)) {
        yearMap.set(y, { students: 0, attempts: 0, avgSum: 0, avgCount: 0 });
      }
      const row = yearMap.get(y)!;
      row.students += 1;
      row.attempts += sr.attendedCount;
      if (sr.avgPercentage != null) {
        row.avgSum += sr.avgPercentage;
        row.avgCount += 1;
      }
    }
    const byYear = Array.from(yearMap.entries()).map(([y, d]) => ({
      year: y,
      students: d.students,
      attempts: d.attempts,
      avgScore:
        d.avgCount > 0 ? Math.round((d.avgSum / d.avgCount) * 10) / 10 : null,
    }));

    const completedAttempts = attempts.length;
    const avgAll =
      attempts.length > 0
        ? attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length
        : null;

    return json({
      filters: {
        collegeId: scopedCollegeId || null,
        departmentId: departmentId || null,
        year: year || null,
        testId: testId || null,
        view,
      },
      summary: {
        totalStudents: allStudents.length,
        totalTests: tests.length,
        totalAttempts: completedAttempts,
        avgPercentage:
          avgAll != null ? Math.round(avgAll * 10) / 10 : null,
        testsWithAttempts: byTest.filter((t) => t.attemptCount > 0).length,
      },
      byDepartment,
      byYear,
      byTest,
      students: studentReports,
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        department: t.department,
      })),
    });
  } catch (e: any) {
    console.error("reports error", e);
    return error(e.message || "Failed to generate report", 500);
  }
}
