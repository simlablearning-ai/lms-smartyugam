import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");
  const testId = searchParams.get("testId");
  const view = searchParams.get("view") || "summary"; // summary | department | year | student

  // Scope for College Admin
  let scopedCollegeId = collegeId;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId || undefined;
  }

  try {
    // Get students matching filters
    const studentWhere: any = {
      role: Role.STUDENT,
      isActive: true,
    };
    if (scopedCollegeId) studentWhere.collegeId = scopedCollegeId;
    if (departmentId) studentWhere.departmentId = departmentId;
    if (year) studentWhere.year = parseInt(year);

    const students = await prisma.user.findMany({
      where: studentWhere,
      select: {
        id: true,
        name: true,
        email: true,
        year: true,
        department: { select: { id: true, name: true, code: true } },
        college: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    });

    // Get tests matching filters
    const testWhere: any = { status: "PUBLISHED" };
    if (scopedCollegeId) testWhere.collegeId = scopedCollegeId;
    if (departmentId) testWhere.departmentId = departmentId;
    if (testId) testWhere.id = testId;

    const tests = await prisma.test.findMany({
      where: testWhere,
      select: {
        id: true,
        title: true,
        totalMarks: true,
        passingMarks: true,
        departmentId: true,
        department: { select: { name: true, code: true } },
      },
      orderBy: { title: "asc" },
    });

    // Get attempts for these students + tests
    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        testId: { in: tests.map((t) => t.id) },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
      select: {
        id: true,
        studentId: true,
        testId: true,
        score: true,
        percentage: true,
        submittedAt: true,
        status: true,
      },
    });

    // Build student-level report
    const studentReports = students.map((student) => {
      const studentAttempts = attempts.filter((a) => a.studentId === student.id);
      const attended = studentAttempts.map((a) => {
        const test = tests.find((t) => t.id === a.testId);
        return {
          testId: a.testId,
          testTitle: test?.title || "Unknown",
          score: a.score,
          percentage: a.percentage,
          totalMarks: test?.totalMarks,
          passed: (a.percentage || 0) >= ((test?.passingMarks || 0) / (test?.totalMarks || 1)) * 100,
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
          ? attended.reduce((sum, a) => sum + (a.percentage || 0), 0) / attended.length
          : null;

      return {
        student,
        attended,
        notAttended,
        totalTests: tests.length,
        attendedCount: attended.length,
        notAttendedCount: notAttended.length,
        avgPercentage,
      };
    });

    // Department summary
    const deptMap = new Map<string, { name: string; students: number; attempts: number; avgScore: number }>();
    for (const sr of studentReports) {
      const deptId = sr.student.department?.id || "none";
      const deptName = sr.student.department?.name || "No Department";
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, { name: deptName, students: 0, attempts: 0, avgScore: 0 });
      }
      const d = deptMap.get(deptId)!;
      d.students += 1;
      d.attempts += sr.attendedCount;
      if (sr.avgPercentage !== null) {
        d.avgScore = (d.avgScore * (d.students - 1) + sr.avgPercentage) / d.students;
      }
    }

    // Year summary
    const yearMap = new Map<number, { students: number; attempts: number; avgScore: number }>();
    for (const sr of studentReports) {
      const y = sr.student.year || 0;
      if (!yearMap.has(y)) {
        yearMap.set(y, { students: 0, attempts: 0, avgScore: 0 });
      }
      const d = yearMap.get(y)!;
      d.students += 1;
      d.attempts += sr.attendedCount;
      if (sr.avgPercentage !== null) {
        d.avgScore = (d.avgScore * (d.students - 1) + sr.avgPercentage) / d.students;
      }
    }

    return json({
      filters: { collegeId: scopedCollegeId, departmentId, year, testId },
      summary: {
        totalStudents: students.length,
        totalTests: tests.length,
        totalAttempts: attempts.length,
        avgAttendance:
          students.length > 0 && tests.length > 0
            ? (attempts.length / (students.length * tests.length)) * 100
            : 0,
      },
      departmentSummary: Array.from(deptMap.entries()).map(([id, data]) => ({
        departmentId: id,
        ...data,
      })),
      yearSummary: Array.from(yearMap.entries()).map(([year, data]) => ({
        year,
        ...data,
      })),
      studentReports,
      tests,
    });
  } catch (e: any) {
    return error(e.message || "Failed to generate report", 500);
  }
}
