import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { generateCertificateNumber } from "@/lib/utils";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  const where: any = {};

  if (auth.session!.user.role === Role.STUDENT) {
    where.studentId = auth.session!.user.id;
  } else if (studentId) {
    where.studentId = studentId;
  } else if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  }

  const certificates = await prisma.certificate.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    include: {
      course: { select: { id: true, title: true, code: true } },
      student: { select: { id: true, name: true, email: true } },
      college: { select: { id: true, name: true, code: true } },
    },
  });

  return json(certificates);
}

// Auto-issue certificate when student passes a course
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { studentId, courseId } = body;

    const sid = studentId || auth.session!.user.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { college: true },
    });
    if (!course) return error("Course not found", 404);

    // Check if already has certificate
    const existing = await prisma.certificate.findFirst({
      where: { studentId: sid, courseId },
    });
    if (existing) return json(existing);

    // Check enrollment progress or average test score
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: sid, courseId } },
    });

    const tests = await prisma.test.findMany({
      where: { courseId, status: "PUBLISHED" },
    });

    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId: sid,
        testId: { in: tests.map((t) => t.id) },
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      },
    });

    const avgScore =
      attempts.length > 0
        ? attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attempts.length
        : enrollment?.progress || 0;

    if (avgScore < (course.passingScore || 40)) {
      return error(`Passing score not met. Current: ${avgScore.toFixed(0)}%`);
    }

    const certNumber = generateCertificateNumber(
      course.college?.code || "LMS",
      new Date().getFullYear()
    );

    const certificate = await prisma.certificate.create({
      data: {
        studentId: sid,
        courseId,
        collegeId: course.collegeId || auth.session!.user.collegeId || "",
        certificateNumber: certNumber,
        score: avgScore,
      },
      include: {
        course: true,
        college: true,
        student: { select: { name: true, email: true } },
      },
    });

    // Mark enrollment completed
    if (enrollment) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress: 100, completedAt: new Date() },
      });
    }

    return json(certificate, 201);
  } catch (e: any) {
    return error(e.message || "Failed to issue certificate", 500);
  }
}
