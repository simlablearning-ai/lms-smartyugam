import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/**
 * Reports for Super Admin / College Admin.
 * Includes both MCQ Tests and TechAbility coding tests.
 * Optional filter: type=MCQ | CODING (omit for both).
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");
  const testId = searchParams.get("testId");
  const typeFilter = (searchParams.get("type") || "").toUpperCase(); // MCQ | CODING | ""
  const view = searchParams.get("view") || "summary";

  let scopedCollegeId: string | undefined = collegeId || undefined;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId || undefined;
  }

  try {
    const studentWhere: any = { role: Role.STUDENT, isActive: true };
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

    const includeMcq = typeFilter !== "CODING";
    const includeTech = typeFilter !== "MCQ";

    type UnifiedTest = {
      id: string;
      title: string;
      status: string;
      totalMarks: number;
      passingMarks: number;
      departmentId: string | null;
      collegeId: string;
      startTime: Date | null;
      endTime: Date | null;
      createdAt: Date;
      kind: "MCQ" | "CODING";
      department: { id: string; name: string; code: string } | null;
      college: { id: string; name: string; code: string } | null;
    };

    let tests: UnifiedTest[] = [];

    if (includeMcq) {
      const testWhere: any = {};
      if (scopedCollegeId) testWhere.collegeId = scopedCollegeId;
      if (testId) testWhere.id = testId;
      else if (departmentId) testWhere.OR = [{ departmentId }, { departmentId: null }];

      let mcq = await prisma.test.findMany({
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

      if (testId && mcq.length === 0) {
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
        if (
          one &&
          !(auth.session!.user.role === Role.COLLEGE_ADMIN &&
            one.collegeId !== auth.session!.user.collegeId)
        ) {
          mcq = [one];
        }
      }

      tests.push(...mcq.map((t) => ({ ...t, kind: "MCQ" as const })));
    }

    if (includeTech) {
      const techWhere: any = {};
      if (scopedCollegeId) techWhere.collegeId = scopedCollegeId;
      if (testId) techWhere.id = testId;
      else if (departmentId) techWhere.OR = [{ departmentId }, { departmentId: null }];

      let tech = await prisma.techTest.findMany({
        where: techWhere,
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

      if (testId && tech.length === 0 && tests.length === 0) {
        const one = await prisma.techTest.findUnique({
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
        if (
          one &&
          !(auth.session!.user.role === Role.COLLEGE_ADMIN &&
            one.collegeId !== auth.session!.user.collegeId)
        ) {
          tech = [one];
        }
      }

      // Avoid duplicating if same id somehow (shouldn't happen)
      const existingIds = new Set(tests.map((t) => t.id));
      tests.push(
        ...tech.filter((t) => !existingIds.has(t.id)).map((t) => ({ ...t, kind: "CODING" as const }))
      );
    }

    const studentIds = students.map((s) => s.id);
    const mcqIds = tests.filter((t) => t.kind === "MCQ").map((t) => t.id);
    const techIds = tests.filter((t) => t.kind === "CODING").map((t) => t.id);

    type AttemptRow = {
      id: string;
      studentId: string;
      testId: string;
      score: number | null;
      percentage: number | null;
      submittedAt: Date | null;
      startedAt: Date;
      status: string;
      timeSpentSec: number | null;
      kind: "MCQ" | "CODING";
    };

    let attempts: AttemptRow[] = [];

    const studentFilterActive = !!(departmentId || year);
    const attemptStudentFilter =
      studentFilterActive && studentIds.length === 0
        ? { studentId: { in: ["__none__"] } }
        : studentFilterActive
          ? { studentId: { in: studentIds } }
          : {};

    if (mcqIds.length > 0) {
      const rows = await prisma.testAttempt.findMany({
        where: {
          testId: { in: mcqIds },
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
          ...attemptStudentFilter,
        },
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
      attempts.push(...rows.map((a) => ({ ...a, kind: "MCQ" as const })));
    }

    if (techIds.length > 0) {
      const rows = await prisma.techAttempt.findMany({
        where: {
          testId: { in: techIds },
          status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
          ...attemptStudentFilter,
        },
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
      attempts.push(...rows.map((a) => ({ ...a, kind: "CODING" as const })));
    }

    if (testId && attempts.length > 0) {
      const missingIds = [
        ...new Set(
          attempts.map((a) => a.studentId).filter((id) => !studentIds.includes(id))
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

    const byTest = tests.map((test) => {
      const testAttempts = attempts.filter((a) => a.testId === test.id);
      const uniqueStudents = new Set(testAttempts.map((a) => a.studentId));
      const pcts = testAttempts
        .map((a) => a.percentage)
        .filter((p): p is number => p != null);
      const avg =
        pcts.length > 0 ? pcts.reduce((s, p) => s + p, 0) / pcts.length : null;
      const passMark =
        test.totalMarks > 0 ? (test.passingMarks / test.totalMarks) * 100 : 40;
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
          kind: test.kind,
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
          kind: a.kind,
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
          kind: t.kind,
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
        type: typeFilter || null,
        view,
      },
      summary: {
        totalStudents: allStudents.length,
        totalTests: tests.length,
        totalAttempts: completedAttempts,
        avgPercentage: avgAll != null ? Math.round(avgAll * 10) / 10 : null,
        testsWithAttempts: byTest.filter((t) => t.attemptCount > 0).length,
        mcqTests: tests.filter((t) => t.kind === "MCQ").length,
        codingTests: tests.filter((t) => t.kind === "CODING").length,
      },
      byDepartment,
      byYear,
      byTest,
      students: studentReports,
      // aliases used by some UI variants
      studentReports,
      departmentSummary: byDepartment,
      yearSummary: byYear,
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        kind: t.kind,
        department: t.department,
      })),
    });
  } catch (e: any) {
    console.error("reports error", e);
    return error(e.message || "Failed to generate report", 500);
  }
}
