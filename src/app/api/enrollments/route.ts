import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { courseId } = body;
    if (!courseId) return error("courseId is required");

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || !course.isActive) return error("Course not found", 404);

    const studentId = auth.session!.user.id;

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing) return json(existing);

    const enrollment = await prisma.enrollment.create({
      data: { studentId, courseId },
      include: { course: { select: { id: true, title: true } } },
    });

    return json(enrollment, 201);
  } catch (e: any) {
    return error(e.message || "Enrollment failed", 500);
  }
}

export async function GET() {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: auth.session!.user.id },
    include: {
      course: {
        include: {
          college: { select: { name: true } },
          department: { select: { name: true } },
          tests: {
            where: { status: "PUBLISHED" },
            select: { id: true, title: true, durationMinutes: true, totalMarks: true },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return json(enrollments);
}
