import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const bank = await prisma.questionBank.findUnique({
    where: { id },
    include: {
      college: { select: { id: true, name: true, code: true } },
      questions: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!bank) return error("Question bank not found", 404);
  return json(bank);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, isActive } = body;

    const bank = await prisma.questionBank.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return json(bank);
  } catch (e: any) {
    return error(e.message || "Update failed", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    // Soft-delete bank; questions remain but unlinked optionally
    await prisma.questionBank.update({
      where: { id },
      data: { isActive: false },
    });
    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Delete failed", 500);
  }
}
