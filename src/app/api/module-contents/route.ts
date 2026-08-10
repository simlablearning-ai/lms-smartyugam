import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, ContentType } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  try {
    const body = await req.json();
    const { moduleId, title, type, body: contentBody, url, durationMin } = body;
    if (!moduleId || !title) return error("moduleId and title required");
    const contentType = (type || "TEXT").toUpperCase() as ContentType;
    const maxOrder = await prisma.moduleContent.aggregate({ where: { moduleId }, _max: { order: true } });
    return json(await prisma.moduleContent.create({
      data: {
        moduleId, title, type: contentType,
        body: contentBody || null, url: url || null,
        order: (maxOrder._max.order ?? 0) + 1,
        durationMin: durationMin != null ? parseInt(durationMin) : null,
      },
    }), 201);
  } catch (e: any) { return error(e.message || "Failed", 500); }
}

