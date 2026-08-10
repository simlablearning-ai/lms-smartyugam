import { prisma } from "@/lib/prisma";
export async function refreshCourseProgress(studentId: string, courseId: string) {
  const modules = await prisma.courseModule.findMany({ where: { courseId, isActive: true }, select: { id: true } });
  if (!modules.length) return;
  const progressRows = await prisma.moduleProgress.findMany({ where: { studentId, moduleId: { in: modules.map((m) => m.id) } } });
  const completedCount = progressRows.filter((p) => p.completedAt).length;
  const progressPct = Math.round((completedCount / modules.length) * 100);
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { finalTestId: true, passingScore: true } });
  let finalPassed = false;
  if (course?.finalTestId) {
    const best = await prisma.testAttempt.findFirst({
      where: { studentId, testId: course.finalTestId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      orderBy: { percentage: "desc" },
    });
    if (best && (best.percentage || 0) >= (course.passingScore || 40)) finalPassed = true;
  }
  const fullyComplete = completedCount === modules.length && (!course?.finalTestId || finalPassed);
  await prisma.enrollment.updateMany({
    where: { studentId, courseId },
    data: { progress: fullyComplete ? 100 : progressPct, ...(fullyComplete ? { completedAt: new Date() } : {}) },
  });
  if (fullyComplete) {
    const existing = await prisma.certificate.findFirst({ where: { studentId, courseId } });
    if (!existing) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { collegeId: true } });
      if (student?.collegeId) {
        await prisma.certificate.create({
          data: { studentId, courseId, collegeId: student.collegeId, certificateNumber: `CERT-${Date.now()}-${studentId.slice(-4)}`, score: progressPct },
        });
      }
    }
  }
}
