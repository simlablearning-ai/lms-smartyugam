import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { refreshCourseProgress } from "@/lib/course-progress";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;
  try {
    const { moduleId, contentId } = await req.json();
    if (!moduleId) return error("moduleId required");
    const studentId = auth.session!.user.id;
    const mod = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { contents: { where: { isActive: true }, select: { id: true } }, course: { select: { id: true } } },
    });
    if (!mod) return error("Module not found", 404);
    let progress = await prisma.moduleProgress.findUnique({ where: { studentId_moduleId: { studentId, moduleId } } });
    let contentsDone: string[] = [];
    try { contentsDone = progress?.contentsDone ? JSON.parse(progress.contentsDone) : []; } catch { contentsDone = []; }
    if (contentId && !contentsDone.includes(contentId)) contentsDone.push(contentId);
    const allIds = mod.contents.map((c) => c.id);
    const allViewed = allIds.length === 0 || allIds.every((id) => contentsDone.includes(id));
    const assessmentPassed = progress?.assessmentPassed || false;
    const completed = allViewed && (mod.assessmentTestId ? assessmentPassed : true);
    progress = await prisma.moduleProgress.upsert({
      where: { studentId_moduleId: { studentId, moduleId } },
      create: { studentId, moduleId, contentsDone: JSON.stringify(contentsDone), assessmentPassed, completedAt: completed ? new Date() : null },
      update: { contentsDone: JSON.stringify(contentsDone), completedAt: completed ? new Date() : null },
    });
    await refreshCourseProgress(studentId, mod.course.id);
    return json(progress);
  } catch (e: any) { return error(e.message || "Failed", 500); }
}

export async function GET(req: Request) {
  const auth = await requireAuth([Role.STUDENT, Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;
  const sp = new URL(req.url).searchParams;
  let studentId = sp.get("studentId");
  const courseId = sp.get("courseId");
  if (auth.session!.user.role === Role.STUDENT) studentId = auth.session!.user.id;
  if (!studentId) return error("studentId required");
  const where: any = { studentId };
  if (courseId) where.module = { courseId };
  return json(await prisma.moduleProgress.findMany({
    where, include: { module: { select: { id: true, title: true, order: true, courseId: true } } },
  }));
}

