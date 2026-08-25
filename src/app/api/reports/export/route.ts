import { prisma } from "@/lib/prisma";
import { requireAuth, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/**
 * Export reports as CSV.
 * Query params: collegeId, departmentId, year, testId, studentId, view
 */
export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");
  const testId = searchParams.get("testId");
  const studentId = searchParams.get("studentId");

  let scopedCollegeId: string | undefined = collegeId ?? undefined;
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    scopedCollegeId = auth.session!.user.collegeId ?? undefined;
  }

  const studentWhere: any = { role: Role.STUDENT, isActive: true };
  if (scopedCollegeId) studentWhere.collegeId = scopedCollegeId;
  if (departmentId) studentWhere.departmentId = departmentId;
  if (year) studentWhere.year = parseInt(year);
  if (studentId) studentWhere.id = studentId;

  const students = await prisma.user.findMany({
    where: studentWhere,
    select: {
      id: true,
      name: true,
      email: true,
        rollNumber: true,
      year: true,
      department: { select: { name: true, code: true } },
      college: { select: { name: true, code: true } },
    },
    orderBy: { name: "asc" },
  });

  const testWhere: any = { status: { in: ["PUBLISHED", "ARCHIVED"] } };
  if (scopedCollegeId) testWhere.collegeId = scopedCollegeId;
  if (testId) testWhere.id = testId;
  else if (departmentId) testWhere.OR = [{ departmentId }, { departmentId: null }];

  const tests = await prisma.test.findMany({
    where: testWhere,
    select: {
      id: true,
      title: true,
      totalMarks: true,
      passingMarks: true,
    },
  });

  const attempts = await prisma.testAttempt.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      testId: { in: tests.map((t) => t.id) },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
    },
    select: {
      studentId: true,
      testId: true,
      score: true,
      percentage: true,
      submittedAt: true,
      status: true,
    },
  });

  // CSV header
  const headers = [
    "Student Name",
    "Roll Number",
    "Email",
    "College",
    "Department",
    "Year",
    "Test",
    "Score",
    "Percentage",
    "Status",
    "Submitted At",
  ];

  const lines: string[] = [headers.join(",")];

  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  for (const student of students) {
    const studentAttempts = attempts.filter((a) => a.studentId === student.id);
    if (studentAttempts.length === 0) {
      lines.push(
        [
          escape(student.name),
          escape(student.rollNumber || ""),
          escape(student.email),
          escape(student.college?.name),
          escape(student.department?.name),
          escape(student.year),
          "",
          "",
          "",
          "Not Attempted",
          "",
        ].join(",")
      );
    } else {
      for (const a of studentAttempts) {
        const test = tests.find((t) => t.id === a.testId);
        lines.push(
          [
            escape(student.name),
            escape(student.rollNumber || ""),
            escape(student.email),
            escape(student.college?.name),
            escape(student.department?.name),
            escape(student.year),
            escape(test?.title),
            escape(a.score),
            escape(a.percentage != null ? Number(a.percentage).toFixed(2) : ""),
            escape(a.status),
            escape(a.submittedAt ? new Date(a.submittedAt).toISOString() : ""),
          ].join(",")
        );
      }
    }
  }

  const csv = lines.join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lms-report-${Date.now()}.csv"`,
    },
  });
}
