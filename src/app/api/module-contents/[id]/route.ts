import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, ContentType } from "@prisma/client";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await req.json();
  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.type !== undefined) data.type = String(body.type).toUpperCase() as ContentType;
  if (body.body !== undefined) data.body = body.body;
  if (body.url !== undefined) data.url = body.url;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  return json(await prisma.moduleContent.update({ where: { id }, data }));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  const { id } = await params;
  await prisma.moduleContent.update({ where: { id }, data: { isActive: false } });
  return json({ success: true });
}

