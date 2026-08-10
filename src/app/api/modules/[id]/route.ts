import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    const body = await req.json();
    return json(await prisma.courseModule.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.order !== undefined && { order: parseInt(body.order) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.assessmentTestId !== undefined && { assessmentTestId: body.assessmentTestId || null }),
      },
      include: { contents: true, assessmentTest: true },
    }));
  } catch (e: any) { return error(e.message || "Failed", 500); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  const { id } = await params;
  await prisma.courseModule.update({ where: { id }, data: { isActive: false } });
  return json({ success: true });
}

