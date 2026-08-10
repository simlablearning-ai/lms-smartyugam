import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, isActive } = body;

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return error("Department not found", 404);

    // College Admin can only edit their own college's departments
    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        college: { select: { id: true, name: true, code: true } },
      },
    });

    return json(department);
  } catch (e: any) {
    return error(e.message || "Failed to update department", 500);
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
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return error("Department not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    await prisma.department.delete({ where: { id } });
    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete department", 500);
  }
}
