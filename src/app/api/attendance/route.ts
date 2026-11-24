import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, AttendanceSource, AttendanceStatus } from "@prisma/client";
import { dayStart } from "@/lib/attendance";

async function facultyCourseIds(facultyId: string) {
  const rows = await prisma.facultyCourseAssignment.findMany({
    where: { facultyId },
    select: { courseId: true },
  });
  return rows.map((r) => r.courseId);
}

export async function GET(req: Request) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.FACULTY,
    Role.STUDENT,
  ]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const courseId = searchParams.get("courseId");
  const source = searchParams.get("source"); // CLASS | TEST | CODING_TEST
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const testId = searchParams.get("testId");
  const techTestId = searchParams.get("techTestId");
  const studentId = searchParams.get("studentId");
  const sessionId = searchParams.get("sessionId");

  const role = auth.session!.user.role;

  // Student: own records only
  if (role === Role.STUDENT) {
    const where: any = { studentId: auth.session!.user.id };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = dayStart(from);
      if (to) where.date.lte = dayStart(to);
    }
    if (source) where.source = source;
    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        course: { select: { id: true, title: true } },
        test: { select: { id: true, title: true } },
        techTest: { select: { id: true, title: true } },
      },
      take: 500,
    });
    return json(records);
  }

  const where: any = {};
  if (sessionId) where.sessionId = sessionId;
  if (courseId) where.courseId = courseId;
  if (source) where.source = source;
  if (testId) where.testId = testId;
  if (techTestId) where.techTestId = techTestId;
  if (studentId) where.studentId = studentId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = dayStart(from);
    if (to) where.date.lte = dayStart(to);
  }

  if (role === Role.FACULTY) {
    const allowed = await facultyCourseIds(auth.session!.user.id);
    if (courseId && !allowed.includes(courseId)) return error("Forbidden", 403);
    where.courseId = courseId ? courseId : { in: allowed.length ? allowed : ["__none__"] };
  } else if (role === Role.COLLEGE_ADMIN) {
    const cid = auth.session!.user.collegeId;
    where.student = { collegeId: cid };
    if (departmentId) where.student = { collegeId: cid, departmentId };
  } else if (role === Role.SUPER_ADMIN) {
    if (collegeId || departmentId) {
      where.student = {};
      if (collegeId) where.student.collegeId = collegeId;
      if (departmentId) where.student.departmentId = departmentId;
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      student: {
        select: {
          id: true,
          name: true,
          rollNumber: true,
          email: true,
          year: true,
          department: { select: { id: true, name: true, code: true } },
          college: { select: { id: true, name: true } },
        },
      },
      course: { select: { id: true, title: true, code: true } },
      test: { select: { id: true, title: true } },
      techTest: { select: { id: true, title: true } },
      session: { select: { id: true, date: true, notes: true } },
    },
    take: 2000,
  });

  return json(records);
}

/** Create / update class session attendance (bulk) */
export async function POST(req: Request) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.FACULTY,
  ]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { courseId, date, notes, records } = body;
    // records: [{ studentId, status: PRESENT|ABSENT }]

    if (!courseId) return error("courseId required");
    if (!date) return error("date required (YYYY-MM-DD)");
    if (!Array.isArray(records) || !records.length) {
      return error("records array required");
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return error("Course not found", 404);

    const role = auth.session!.user.role;
    if (role === Role.FACULTY) {
      const ok = await prisma.facultyCourseAssignment.findFirst({
        where: { facultyId: auth.session!.user.id, courseId },
      });
      if (!ok) return error("Course not assigned to you", 403);
    } else if (role === Role.COLLEGE_ADMIN) {
      if (course.collegeId !== auth.session!.user.collegeId) {
        return error("Forbidden", 403);
      }
    }

    const day = dayStart(String(date).slice(0, 10));

    const session = await prisma.attendanceSession.upsert({
      where: { courseId_date: { courseId, date: day } },
      create: {
        courseId,
        date: day,
        notes: notes || null,
        markedById: auth.session!.user.id,
      },
      update: {
        notes: notes || null,
        markedById: auth.session!.user.id,
      },
    });

    // Replace records for this session
    await prisma.attendanceRecord.deleteMany({ where: { sessionId: session.id } });

    await prisma.attendanceRecord.createMany({
      data: records.map((r: any) => ({
        studentId: r.studentId,
        date: day,
        status:
          String(r.status).toUpperCase() === "ABSENT"
            ? AttendanceStatus.ABSENT
            : AttendanceStatus.PRESENT,
        source: AttendanceSource.CLASS,
        courseId,
        sessionId: session.id,
        markedById: auth.session!.user.id,
      })),
    });

    const saved = await prisma.attendanceSession.findUnique({
      where: { id: session.id },
      include: {
        records: {
          include: {
            student: {
              select: { id: true, name: true, rollNumber: true },
            },
          },
        },
      },
    });

    return json(saved, 201);
  } catch (e: any) {
    return error(e.message || "Failed to save attendance", 500);
  }
}
