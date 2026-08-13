import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** In-depth single attempt report */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
            rollNumber: true,
          year: true,
          department: { select: { name: true, code: true } },
          college: { select: { name: true, code: true } },
        },
      },
      test: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          passingMarks: true,
          durationMinutes: true,
          collegeId: true,
        },
      },
      answers: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              marks: true,
            },
          },
        },
      },
    },
  });

  if (!attempt) return error("Attempt not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    attempt.test.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  let violations: any[] = [];
  try {
    violations = attempt.violations ? JSON.parse(attempt.violations) : [];
  } catch {
    violations = [];
  }

  let feedback = null;
  try {
    feedback = attempt.feedback ? JSON.parse(attempt.feedback) : null;
  } catch {
    feedback = null;
  }

  return json({
    ...attempt,
    violations,
    feedback,
    answers: attempt.answers.map((a) => {
      let options: string[] = [];
      try {
        const o = a.question.options ? JSON.parse(a.question.options) : [];
        options = Array.isArray(o) ? o : String(a.question.options || "").split("|");
      } catch {
        options = String(a.question.options || "").split("|").filter(Boolean);
      }
      return {
        id: a.id,
        answer: a.answer,
        isCorrect: a.isCorrect,
        marksAwarded: a.marksAwarded,
        question: {
          ...a.question,
          optionsList: options,
        },
      };
    }),
  });
}

/** Reset attempt so student can retake (admin only) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { attemptId } = await params;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: { select: { collegeId: true } } },
  });
  if (!attempt) return error("Attempt not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    attempt.test.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  // Delete answers then attempt
  await prisma.answer.deleteMany({ where: { attemptId } });
  await prisma.testAttempt.delete({ where: { id: attemptId } });

  return json({ success: true, message: "Attempt reset. Student can take the test again." });
}
