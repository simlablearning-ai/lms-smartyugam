import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { runOnce, evaluateCases, parseTestCases } from "@/lib/tech-runner";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/tech-ability/run
 * Body:
 *  - mode: "once" | "cases"
 *  - language, code
 *  - stdin (for once)
 *  - problemId (for cases — loads test cases from DB)
 *  - testCases (optional override array)
 *  - maxMarks
 */
export async function POST(req: Request) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.STUDENT,
  ]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { mode = "once", language, code, stdin, problemId, testCases, maxMarks } =
      body;

    if (!code || !language) return error("code and language are required");

    if (mode === "once") {
      const result = await runOnce(language, code, stdin || "");
      return json(result);
    }

    // Evaluate against test cases
    let cases = Array.isArray(testCases) ? testCases : [];
    let marks = maxMarks ? Number(maxMarks) : 10;

    if (problemId) {
      const problem = await prisma.techProblem.findUnique({
        where: { id: problemId },
      });
      if (!problem) return error("Problem not found", 404);
      cases = parseTestCases(problem.testCases);
      marks = problem.marks || marks;

      // For students, only run against non-hidden cases for live feedback
      // (full scoring happens on final submit server-side)
      if (auth.session!.user.role === Role.STUDENT) {
        cases = cases.filter((c) => !c.isHidden);
      }
    }

    if (!cases.length) {
      return json({
        score: 0,
        results: [],
        passedCount: 0,
        message: "No test cases to run",
      });
    }

    const evalResult = await evaluateCases(
      language,
      code,
      cases,
      marks,
      auth.session!.user.role === Role.STUDENT
    );

    return json(evalResult);
  } catch (e: any) {
    return error(e.message || "Run failed", 500);
  }
}
