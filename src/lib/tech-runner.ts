/**
 * Free code runner for TechAbility.
 * Uses Judge0 CE (self-hosted or public) when JUDGE0_URL is set.
 * Falls back to save-only (no execution) when not configured.
 *
 * Env:
 *   JUDGE0_URL  e.g. https://ce.judge0.com  or your self-hosted instance
 *   JUDGE0_KEY  optional X-Auth-Token / RapidAPI key
 */

export type TestCase = {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
};

export type CaseResult = {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  isHidden: boolean;
  error?: string;
};

const LANG_IDS: Record<string, number> = {
  PYTHON: 71, // Python 3.8.1
  JAVA: 62, // Java (OpenJDK 13)
  JAVASCRIPT: 63, // JavaScript (Node.js 12)
  CPP: 54, // C++ (GCC 9)
  C: 50, // C (GCC 9)
};

function normalizeOutput(s: string): string {
  return (s || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trimEnd();
}

export async function runOnce(
  language: string,
  sourceCode: string,
  stdin: string = ""
): Promise<{ stdout: string; stderr: string; status: string; time?: string }> {
  const base = process.env.JUDGE0_URL?.replace(/\/$/, "");
  if (!base) {
    return {
      stdout: "",
      stderr: "Code runner not configured (set JUDGE0_URL). Code saved only.",
      status: "No Runner",
    };
  }

  const langId = LANG_IDS[language] ?? 71;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.JUDGE0_KEY) {
    headers["X-Auth-Token"] = process.env.JUDGE0_KEY;
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_KEY;
  }

  try {
    const createRes = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: langId,
        stdin: stdin || "",
        cpu_time_limit: 5,
        memory_limit: 128000,
      }),
    });

    if (!createRes.ok) {
      const t = await createRes.text();
      return { stdout: "", stderr: `Runner error: ${t}`, status: "Error" };
    }

    const data = await createRes.json();
    const statusDesc = data.status?.description || "Unknown";
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || data.compile_output || "",
      status: statusDesc,
      time: data.time,
    };
  } catch (e: any) {
    return {
      stdout: "",
      stderr: e?.message || "Runner request failed",
      status: "Error",
    };
  }
}

/**
 * Evaluate code against multiple test cases.
 * Returns score (0..maxMarks) and per-case results.
 * Hidden cases are still scored but actual output may be stripped for students.
 */
export async function evaluateCases(
  language: string,
  sourceCode: string,
  testCases: TestCase[],
  maxMarks: number,
  stripHiddenDetails = false
): Promise<{ score: number; results: CaseResult[]; passedCount: number }> {
  if (!testCases.length) {
    return { score: 0, results: [], passedCount: 0 };
  }

  const results: CaseResult[] = [];
  let passed = 0;

  for (const tc of testCases) {
    const run = await runOnce(language, sourceCode, tc.input ?? "");
    const actual = normalizeOutput(run.stdout);
    const expected = normalizeOutput(tc.expectedOutput ?? "");
    const ok =
      run.status === "Accepted" ||
      (run.status !== "Error" &&
        run.status !== "No Runner" &&
        actual === expected &&
        !run.stderr);

    // When no runner: treat as not executed (score 0) but still save code
    const passedCase =
      process.env.JUDGE0_URL && ok && actual === expected && !run.stderr;

    if (passedCase) passed++;

    results.push({
      input: tc.input ?? "",
      expectedOutput: stripHiddenDetails && tc.isHidden ? "[hidden]" : (tc.expectedOutput ?? ""),
      actualOutput:
        stripHiddenDetails && tc.isHidden
          ? passedCase
            ? "[passed]"
            : "[failed]"
          : actual || run.stderr || "",
      passed: !!passedCase,
      isHidden: !!tc.isHidden,
      error: run.status === "No Runner" ? run.stderr : run.stderr || undefined,
    });
  }

  const score = testCases.length
    ? Math.round((passed / testCases.length) * maxMarks * 100) / 100
    : 0;

  return { score, results, passedCount: passed };
}

export function parseTestCases(raw: string | null | undefined): TestCase[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
