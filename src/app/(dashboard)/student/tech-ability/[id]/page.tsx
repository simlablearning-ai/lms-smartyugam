"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ProctorWrapper } from "@/components/ProctorWrapper";
import { Clock, AlertTriangle, CheckCircle2, Send, Play, Code2 } from "lucide-react";
import { checkTestLive } from "@/lib/test-live";

type ProblemItem = {
  id: string;
  marks: number;
  order: number;
  problem: {
    id: string;
    title: string;
    description: string;
    language: string;
    starterCode?: string | null;
    testCases?: string;
    marks: number;
  };
};

export default function TakeTechTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [runOutput, setRunOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [violations, setViolations] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tech-ability/tests/${testId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTest(data);
          setTimeLeft((data.durationMinutes || 60) * 60);
          const initial: Record<string, string> = {};
          (data.problems || []).forEach((tp: ProblemItem) => {
            initial[tp.problem.id] = tp.problem.starterCode || "";
          });
          setCodes(initial);
        }
      })
      .catch(() => setError("Failed to load test"))
      .finally(() => setLoading(false));
  }, [testId]);

  useEffect(() => {
    if (!started || timeLeft <= 0 || result) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, timeLeft, result]);

  async function startAttempt() {
    try {
      const res = await fetch("/api/tech-ability/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Cannot start attempt");
        return;
      }
      setAttemptId(data.id);
      setStarted(true);
    } catch {
      setError("Network error");
    }
  }

  const handleViolation = useCallback((v: any[]) => {
    setViolations(v);
  }, []);

  async function runCode() {
    const problems: ProblemItem[] = test?.problems || [];
    const tp = problems[activeIdx];
    if (!tp) return;
    setRunning(true);
    setRunOutput("Running...");
    try {
      const res = await fetch("/api/tech-ability/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cases",
          language: tp.problem.language,
          code: codes[tp.problem.id] || "",
          problemId: tp.problem.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunOutput(data.error || "Run failed");
        return;
      }
      if (data.message) {
        setRunOutput(data.message);
        return;
      }
      const lines = (data.results || []).map(
        (r: any, i: number) =>
          `Case ${i + 1}: ${r.passed ? "PASS" : "FAIL"}${r.error ? " — " + r.error : ""}\n  out: ${r.actualOutput}`
      );
      setRunOutput(
        `Score: ${data.score} / sample cases\n${lines.join("\n") || "No public cases"}`
      );
    } catch {
      setRunOutput("Network error");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit(auto = false, violated = false) {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    const problems: ProblemItem[] = test?.problems || [];
    const submissions = problems.map((tp) => ({
      problemId: tp.problem.id,
      code: codes[tp.problem.id] || "",
      language: tp.problem.language,
    }));

    try {
      const res = await fetch("/api/tech-ability/attempts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          submissions,
          action: "submit",
          violations,
          violated,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ...data, _violated: violated });
      } else {
        alert(data.error || "Submit failed");
      }
    } catch {
      alert("Network error while submitting");
    } finally {
      setSubmitting(false);
    }
  }

  const handleMaxViolations = useCallback(() => {
    handleSubmit(true, true);
  }, [attemptId, codes, violations, submitting]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading coding test...</p>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => router.push("/student/tech-ability")}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Submitted</h1>
          <p className="text-slate-500 mb-6">{test?.title}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{result.score?.toFixed(1) ?? "—"}</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{result.percentage?.toFixed(0) ?? "—"}%</p>
              <p className="text-xs text-slate-500">Percentage</p>
            </div>
          </div>
          {violations.length > 0 && (
            <p className="text-sm text-amber-600 mb-4">{violations.length} proctoring violation(s)</p>
          )}
          <button
            onClick={() => router.push("/student/tech-ability")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg"
          >
            Back to TechAbility
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Code2 className="h-8 w-8 text-violet-600" />
            <h1 className="text-xl font-bold text-slate-900">{test?.title}</h1>
          </div>
          {test?.description && <p className="text-sm text-slate-500 mb-4">{test.description}</p>}
          <div className="space-y-2 text-sm text-slate-600 mb-6">
            <p>Duration: <strong>{test?.durationMinutes} minutes</strong></p>
            <p>Problems: <strong>{test?.problems?.length || 0}</strong></p>
            <p>Total marks: <strong>{test?.totalMarks}</strong></p>
            {test?.isProctored && (
              <p className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Proctored — fullscreen required; tab switches are recorded.
              </p>
            )}
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</div>
          )}
          {(() => {
            const live = test ? checkTestLive(test) : { live: false, reason: "Loading..." };
            if (!live.live) {
              return (
                <div className="space-y-3">
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {live.reason || "Not live yet."}
                  </div>
                  <button disabled className="w-full bg-slate-300 text-slate-600 font-medium py-2.5 rounded-lg cursor-not-allowed">
                    Test not live
                  </button>
                </div>
              );
            }
            return (
              <button
                onClick={startAttempt}
                disabled={(test?.problems?.length || 0) === 0}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg"
              >
                Start coding test
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  const problems: ProblemItem[] = test?.problems || [];
  const current = problems[activeIdx];

  const content = (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{test?.title}</p>
          <p className="text-xs text-slate-500">
            Problem {activeIdx + 1} of {problems.length}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {violations.length > 0 && (
            <span className="text-xs text-red-600 font-medium">{violations.length} violation(s)</span>
          )}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${
              timeLeft < 60 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit all"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Problem list */}
        <aside className="lg:w-48 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto">
          {problems.map((tp, i) => (
            <button
              key={tp.problem.id}
              onClick={() => {
                setActiveIdx(i);
                setRunOutput("");
              }}
              className={`text-left text-xs px-3 py-2 rounded-lg whitespace-nowrap lg:whitespace-normal ${
                i === activeIdx
                  ? "bg-violet-100 text-violet-800 font-medium"
                  : "hover:bg-slate-50 text-slate-600"
              }`}
            >
              {i + 1}. {tp.problem.title}
            </button>
          ))}
        </aside>

        {/* Statement + editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {current && (
            <>
              <div className="p-4 bg-white border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 mb-1">
                  {current.problem.title}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({current.problem.language} · {current.marks} marks)
                  </span>
                </h2>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans mt-2 max-h-40 overflow-y-auto">
                  {current.problem.description}
                </pre>
              </div>

              <div className="flex-1 flex flex-col p-3 gap-2 min-h-[280px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Editor</span>
                  <button
                    onClick={runCode}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-3 py-1.5 rounded-lg"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {running ? "Running..." : "Run (sample)"}
                  </button>
                </div>
                <textarea
                  value={codes[current.problem.id] || ""}
                  onChange={(e) =>
                    setCodes({ ...codes, [current.problem.id]: e.target.value })
                  }
                  spellCheck={false}
                  className="flex-1 min-h-[200px] w-full font-mono text-sm p-3 rounded-lg border border-slate-300 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Write your code here..."
                />
                {runOutput && (
                  <pre className="text-xs bg-slate-800 text-slate-200 p-3 rounded-lg max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {runOutput}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (test?.isProctored) {
    return (
      <ProctorWrapper
        onViolation={handleViolation}
        maxViolations={4}
        onMaxViolationsReached={handleMaxViolations}
      >
        {content}
      </ProctorWrapper>
    );
  }

  return content;
}
