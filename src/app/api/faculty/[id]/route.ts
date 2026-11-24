import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json();

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.FACULTY) return error("Faculty not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    user.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  const data: any = {};
  if (body.name) data.name = String(body.name).trim();
  if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
  if (body.isActive !== undefined) data.isActive = !!body.isActive;
  if (body.password) data.password = await hash(String(body.password), 12);

  await prisma.user.update({ where: { id }, data });

  if (Array.isArray(body.courseIds)) {
    await prisma.facultyCourseAssignment.deleteMany({ where: { facultyId: id } });
    const ids = body.courseIds.filter(Boolean);
    if (ids.length) {
      await prisma.facultyCourseAssignment.createMany({
        data: ids.map((courseId: string) => ({
          facultyId: id,
          courseId,
          assignedById: auth.session!.user.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  const full = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      facultyAssignments: {
        include: { course: { select: { id: true, title: true } } },
      },
    },
  });

  return json(full);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.FACULTY) return error("Faculty not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    user.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return json({ success: true });
}
