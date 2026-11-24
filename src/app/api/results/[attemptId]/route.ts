import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** In-depth single attempt report (MCQ or TechAbility) */
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

  if (attempt) {
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
      kind: "MCQ",
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

  // TechAbility attempt fallback
  const tech = await prisma.techAttempt.findUnique({
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
      submissions: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              language: true,
              marks: true,
            },
          },
        },
      },
    },
  });

  if (!tech) return error("Attempt not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    tech.test.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  let violations: any[] = [];
  try {
    violations = tech.violations ? JSON.parse(tech.violations) : [];
  } catch {
    violations = [];
  }

  return json({
    id: tech.id,
    kind: "CODING",
    studentId: tech.studentId,
    student: tech.student,
    test: tech.test,
    score: tech.score,
    percentage: tech.percentage,
    status: tech.status,
    startedAt: tech.startedAt,
    submittedAt: tech.submittedAt,
    timeSpentSec: tech.timeSpentSec,
    violations,
    // Map coding submissions into a shape the modal can list without AnswerAnalysis questions
    answers: tech.submissions.map((s) => {
      let caseResults: any[] = [];
      try {
        caseResults = s.results ? JSON.parse(s.results) : [];
      } catch {
        caseResults = [];
      }
      return {
        id: s.id,
        answer: s.code,
        isCorrect: s.maxScore > 0 ? s.score >= s.maxScore : null,
        marksAwarded: s.score,
        question: {
          id: s.problem.id,
          text: s.problem.title,
          type: "CODING",
          options: null,
          correctAnswer: "",
          explanation: `Language: ${s.language} · Cases: ${Array.isArray(caseResults) ? caseResults.length : 0}`,
          marks: s.maxScore,
          optionsList: [],
        },
        caseResults,
        language: s.language,
      };
    }),
  });
}

/** Reset attempt so student can retake (admin only) — MCQ or TechAbility */
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

  if (attempt) {
    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      attempt.test.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }
    await prisma.answer.deleteMany({ where: { attemptId } });
    await prisma.testAttempt.delete({ where: { id: attemptId } });
    return json({ success: true, message: "Attempt reset. Student can take the test again." });
  }

  const tech = await prisma.techAttempt.findUnique({
    where: { id: attemptId },
    include: { test: { select: { collegeId: true } } },
  });
  if (!tech) return error("Attempt not found", 404);

  if (
    auth.session!.user.role === Role.COLLEGE_ADMIN &&
    tech.test.collegeId !== auth.session!.user.collegeId
  ) {
    return error("Forbidden", 403);
  }

  await prisma.techSubmission.deleteMany({ where: { attemptId } });
  await prisma.techAttempt.delete({ where: { id: attemptId } });

  return json({ success: true, message: "TechAbility attempt reset. Student can take the test again." });
}
