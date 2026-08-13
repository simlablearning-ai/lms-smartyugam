import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) return error("ids required");

    const collegeId =
      auth.session!.user.role === Role.COLLEGE_ADMIN
        ? auth.session!.user.collegeId
        : null;

    const tests = await prisma.test.findMany({
      where: {
        id: { in: ids },
        ...(collegeId ? { collegeId } : {}),
      },
      select: { id: true },
    });
    const allowed = tests.map((t) => t.id);
    if (!allowed.length) return error("No tests to delete", 404);

    await prisma.answer.deleteMany({
      where: { attempt: { testId: { in: allowed } } },
    });
    await prisma.testAttempt.deleteMany({ where: { testId: { in: allowed } } });
    await prisma.testQuestion.deleteMany({ where: { testId: { in: allowed } } });
    await prisma.courseModule.updateMany({
      where: { assessmentTestId: { in: allowed } },
      data: { assessmentTestId: null },
    });
    try {
      await prisma.course.updateMany({
        where: { finalTestId: { in: allowed } },
        data: { finalTestId: null },
      });
    } catch {}

    const result = await prisma.test.deleteMany({ where: { id: { in: allowed } } });
    return json({ deleted: result.count });
  } catch (e: any) {
    return error(e.message || "Bulk delete failed", 500);
  }
}
