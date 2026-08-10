import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: {
      test: {
        include: {
          questions: {
            include: { question: true },
            orderBy: { order: "asc" },
          },
        },
      },
      answers: true,
      student: { select: { id: true, name: true, email: true } },
    },
  });

  if (!attempt) return error("Attempt not found", 404);

  if (
    auth.session!.user.role === Role.STUDENT &&
    attempt.studentId !== auth.session!.user.id
  ) {
    return error("Forbidden", 403);
  }

  return json(attempt);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const { answers, violations, action, violated } = body; // action: "save" | "submit"

    const attempt = await prisma.testAttempt.findUnique({
      where: { id },
      include: {
        test: {
          include: {
            questions: { include: { question: true } },
          },
        },
      },
    });

    if (!attempt) return error("Attempt not found", 404);
    if (attempt.studentId !== auth.session!.user.id) return error("Forbidden", 403);
    if (attempt.status !== "IN_PROGRESS") return error("Attempt already submitted");
    // attempt.test.courseId is available on Test model

    // Save answers
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        const tq = attempt.test.questions.find(
          (q) => q.questionId === ans.questionId
        );
        if (!tq) continue;

        const isCorrect =
          String(ans.answer).trim().toLowerCase() ===
          String(tq.question.correctAnswer).trim().toLowerCase();

        await prisma.answer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: id,
              questionId: ans.questionId,
            },
          },
          create: {
            attemptId: id,
            questionId: ans.questionId,
            answer: ans.answer || "",
            isCorrect,
            marksAwarded: isCorrect ? tq.marks : 0,
          },
          update: {
            answer: ans.answer || "",
            isCorrect,
            marksAwarded: isCorrect ? tq.marks : 0,
          },
        });
      }
    }

    // Update violations
    if (violations) {
      await prisma.testAttempt.update({
        where: { id },
        data: {
          violations: typeof violations === "string" ? violations : JSON.stringify(violations),
        },
      });
    }

    // Submit
    if (action === "submit") {
      const allAnswers = await prisma.answer.findMany({
        where: { attemptId: id },
      });

      const totalScore = allAnswers.reduce((sum, a) => sum + a.marksAwarded, 0);
      const maxFromQuestions = attempt.test.questions.reduce((s, tq) => s + (tq.marks || 1), 0);
      const denom = maxFromQuestions > 0 ? maxFromQuestions : attempt.test.totalMarks || 1;
      const percentage = (totalScore / denom) * 100;

      const started = new Date(attempt.startedAt).getTime();
      const timeSpentSec = Math.floor((Date.now() - started) / 1000);

      const updated = await prisma.testAttempt.update({
        where: { id },
        data: {
          status: violated ? "VIOLATED" : "SUBMITTED",
          submittedAt: new Date(),
          score: totalScore,
          percentage,
          timeSpentSec,
          violations: violations
            ? typeof violations === "string"
              ? violations
              : JSON.stringify(violations)
            : attempt.violations,
        },
      });

      // Update course enrollment progress if test is linked to a course
      if (attempt.test.courseId) {
        const courseId = attempt.test.courseId;
        const studentId = attempt.studentId;
        const courseTests = await prisma.test.findMany({
          where: { courseId, status: "PUBLISHED" },
          select: { id: true, totalMarks: true, passingMarks: true },
        });
        const courseAttempts = await prisma.testAttempt.findMany({
          where: {
            studentId,
            testId: { in: courseTests.map((t) => t.id) },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
          },
          select: { testId: true, percentage: true },
        });
        const best = new Map<string, number>();
        for (const a of courseAttempts) {
          const prev = best.get(a.testId) ?? -1;
          if ((a.percentage || 0) > prev) best.set(a.testId, a.percentage || 0);
        }
        let passed = 0;
        for (const t of courseTests) {
          const pct = best.get(t.id);
          if (pct == null) continue;
          const threshold = t.totalMarks > 0 ? (t.passingMarks / t.totalMarks) * 100 : 40;
          if (pct >= threshold) passed++;
        }
        const progress =
          courseTests.length > 0 ? Math.round((passed / courseTests.length) * 100) : 0;
        const completed = courseTests.length > 0 && passed === courseTests.length;

        await prisma.enrollment.updateMany({
          where: { studentId, courseId },
          data: {
            progress,
            ...(completed ? { completedAt: new Date() } : {}),
          },
        });
      }

      return json(updated);
    }

    const refreshed = await prisma.testAttempt.findUnique({ where: { id } });
    return json(refreshed);
  } catch (e: any) {
    return error(e.message || "Failed to update attempt", 500);
  }
}
