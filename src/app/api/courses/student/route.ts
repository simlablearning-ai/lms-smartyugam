import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** Courses visible to the logged-in student (same college) + enrollment status */
export async function GET() {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  const studentId = auth.session!.user.id;
  const collegeId = auth.session!.user.collegeId;

  if (!collegeId) {
    return json([]);
  }

  const courses = await prisma.course.findMany({
    where: {
      isActive: true,
      OR: [
        { collegeId },
        { collegeId: null }, // global courses
      ],
    },
    orderBy: { title: "asc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      tests: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          totalMarks: true,
          isProctored: true,
        },
      },
      enrollments: {
        where: { studentId },
        select: { id: true, progress: true, enrolledAt: true, completedAt: true },
      },
      _count: { select: { tests: true, enrollments: true } },
    },
  });

  const mapped = courses.map((c) => ({
    ...c,
    enrollment: c.enrollments[0] || null,
    enrollments: undefined,
  }));

  return json(mapped);
}
