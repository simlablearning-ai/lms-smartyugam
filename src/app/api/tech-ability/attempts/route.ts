import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { evaluateCases, parseTestCases } from "@/lib/tech-runner";
import { markTestAttendance } from "@/lib/attendance";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const { testId } = await req.json();
    if (!testId) return error("testId required");

    const studentId = auth.session!.user.id;
    const test = await prisma.techTest.findUnique({
      where: { id: testId },
      include: { _count: { select: { problems: true } } },
    });
    if (!test) return error("Test not found", 404);
    if (test.status !== "PUBLISHED") return error("Test is not live");

    const prev = await prisma.techAttempt.count({
      where: {
        testId,
        studentId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
      },
    });
    if (prev >= (test.maxAttempts || 1)) {
      return error(`Maximum attempts (${test.maxAttempts}) reached`);
    }

    const existing = await prisma.techAttempt.findFirst({
      where: { testId, studentId, status: "IN_PROGRESS" },
    });
    if (existing) return json(existing);

    const attempt = await prisma.techAttempt.create({
      data: {
        testId,
        studentId,
        status: "IN_PROGRESS",
      },
    });

    return json(attempt, 201);
  } catch (e: any) {
    return error(e.message || "Failed to start attempt", 500);
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { attemptId, submissions, action, violations, violated } = body;

    if (!attemptId) return error("attemptId required");

    const attempt = await prisma.techAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            problems: { include: { problem: true } },
          },
        },
      },
    });

    if (!attempt) return error("Attempt not found", 404);
    if (attempt.studentId !== auth.session!.user.id) {
      return error("Forbidden", 403);
    }
    if (attempt.status !== "IN_PROGRESS") {
      return error("Attempt already submitted");
    }

    if (Array.isArray(submissions)) {
      for (const sub of submissions) {
        const { problemId, code, language } = sub;
        if (!problemId || code === undefined) continue;

        const tp = attempt.test.problems.find((p) => p.problemId === problemId);
        if (!tp) continue;

        const cases = parseTestCases(tp.problem.testCases);
        const maxScore = tp.marks || tp.problem.marks || 10;

        let score = 0;
        let resultsJson: string | null = null;

        if (action === "submit" || action === "evaluate") {
          const evalResult = await evaluateCases(
            language || tp.problem.language,
            code,
            cases,
            maxScore,
            true
          );
          score = evalResult.score;
          resultsJson = JSON.stringify(evalResult.results);
        }

        await prisma.techSubmission.upsert({
          where: {
            attemptId_problemId: { attemptId, problemId },
          },
          create: {
            attemptId,
            problemId,
            code,
            language: language || tp.problem.language,
            score,
            maxScore,
            results: resultsJson,
          },
          update: {
            code,
            language: language || tp.problem.language,
            score,
            maxScore,
            results: resultsJson,
            submittedAt: new Date(),
          },
        });
      }
    }

    if (action === "submit") {
      const allSubs = await prisma.techSubmission.findMany({
        where: { attemptId },
      });
      const totalScore = allSubs.reduce((s, x) => s + (x.score || 0), 0);
      const totalMax =
        attempt.test.problems.reduce((s, p) => s + (p.marks || 10), 0) ||
        attempt.test.totalMarks ||
        100;
      const percentage =
        totalMax > 0 ? Math.round((totalScore / totalMax) * 10000) / 100 : 0;

      const status = violated ? "VIOLATED" : "SUBMITTED";

      const updated = await prisma.techAttempt.update({
        where: { id: attemptId },
        data: {
          status,
          submittedAt: new Date(),
          score: totalScore,
          percentage,
          violations: violations ? JSON.stringify(violations) : attempt.violations,
          timeSpentSec: Math.floor(
            (Date.now() - new Date(attempt.startedAt).getTime()) / 1000
          ),
        },
      });

      try {
        await markTestAttendance({
          studentId: attempt.studentId,
          source: "CODING_TEST",
          techTestId: attempt.testId,
          attemptId,
        });
      } catch (e) {
        console.error("tech attendance mark failed", e);
      }

      return json(updated);
    }

    return json({ ok: true, attemptId });
  } catch (e: any) {
    return error(e.message || "Failed to update attempt", 500);
  }
}
