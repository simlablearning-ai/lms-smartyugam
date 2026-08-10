import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      finalTest: { select: { id: true, title: true, status: true, durationMinutes: true, totalMarks: true, passingMarks: true } },
      modules: { where: { isActive: true }, orderBy: { order: "asc" },
        include: {
          contents: { where: { isActive: true }, orderBy: { order: "asc" } },
          assessmentTest: { select: { id: true, title: true, status: true, durationMinutes: true, _count: { select: { questions: true } } } },
        },
      },
      _count: { select: { enrollments: true, tests: true } },
    },
  });
  if (!course) return error("Course not found", 404);
  return json(course);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, code, departmentId, passingScore, isActive, finalTestId } = body;

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return error("Course not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(code !== undefined && { code }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(passingScore !== undefined && { passingScore: parseInt(passingScore) }),
        ...(isActive !== undefined && { isActive }),
        ...(finalTestId !== undefined && { finalTestId: finalTestId || null }),
      },
      include: {
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return json(course);
  } catch (e: any) {
    return error(e.message || "Failed to update course", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return error("Course not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    await prisma.course.update({
      where: { id },
      data: { isActive: false },
    });

    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete course", 500);
  }
}
