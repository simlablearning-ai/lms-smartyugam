import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return error("courseId is required");
  return json(await prisma.courseModule.findMany({
    where: { courseId, isActive: true }, orderBy: { order: "asc" },
    include: {
      contents: { where: { isActive: true }, orderBy: { order: "asc" } },
      assessmentTest: { select: { id: true, title: true, status: true, durationMinutes: true, _count: { select: { questions: true } } } },
    },
  }));
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  try {
    const { courseId, title, description } = await req.json();
    if (!courseId || !title) return error("courseId and title required");
    const maxOrder = await prisma.courseModule.aggregate({ where: { courseId }, _max: { order: true } });
    return json(await prisma.courseModule.create({
      data: { courseId, title, description: description || null, order: (maxOrder._max.order ?? 0) + 1 },
      include: { contents: true, assessmentTest: true },
    }), 201);
  } catch (e: any) { return error(e.message || "Failed", 500); }
}

