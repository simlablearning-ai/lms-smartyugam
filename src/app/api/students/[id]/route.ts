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

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, password, departmentId, year, isActive, rollNumber } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== Role.STUDENT) {
      return error("Student not found", 404);
    }

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email.toLowerCase();
    if (departmentId !== undefined) data.departmentId = departmentId || null;
    if (year !== undefined) data.year = year ? parseInt(year) : null;
    if (rollNumber !== undefined) data.rollNumber = rollNumber ? String(rollNumber).trim() : null;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.password = await hash(password, 12);

    const student = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        year: true,
        isActive: true,
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return json(student);
  } catch (e: any) {
    return error(e.message || "Failed to update student", 500);
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
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== Role.STUDENT) {
      return error("Student not found", 404);
    }

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete student", 500);
  }
}
