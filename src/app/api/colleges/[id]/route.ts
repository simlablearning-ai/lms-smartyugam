import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const college = await prisma.college.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, departments: true, courses: true } },
    },
  });

  if (!college) return error("College not found", 404);
  return json(college);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, code, address, city, state, logoUrl, isActive } = body;

    const college = await prisma.college.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return json(college);
  } catch (e: any) {
    return error(e.message || "Failed to update college", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;

    // Soft delete preferred, but for now hard delete with cascade
    await prisma.college.delete({ where: { id } });
    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete college", 500);
  }
}
