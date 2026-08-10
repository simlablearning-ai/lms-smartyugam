import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";

  const where: any = { userId: auth.session!.user.id };
  if (unreadOnly) where.read = false;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({
      where: { userId: auth.session!.user.id, read: false },
    }),
  ]);

  return json({ items, unreadCount });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const userId = auth.session!.user.id;

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return json({ ok: true });
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId },
      data: { read: true },
    });
    return json({ ok: true });
  }

  return error("id or all required");
}
