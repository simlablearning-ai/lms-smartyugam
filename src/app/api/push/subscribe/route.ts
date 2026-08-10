import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return error("Invalid subscription");
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: auth.session!.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      userId: auth.session!.user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return json({ ok: true });
}
