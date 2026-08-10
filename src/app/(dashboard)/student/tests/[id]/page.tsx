"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ProctorWrapper } from "@/components/ProctorWrapper";
import { Clock, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { checkTestLive } from "@/lib/test-live";

type Question = {
  id: string;
  marks: number;
  order: number;
  question: {
    id: string;
    text: string;
    type: string;
    options: string | null;
    marks: number;
  };
};

export default function TakeTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [violations, setViolations] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  // Load test
  useEffect(() => {
    fetch(`/api/tests/${testId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTest(data);
          setTimeLeft((data.durationMinutes || 60) * 60);
        }
      })
      .catch(() => setError("Failed to load test"))
      .finally(() => setLoading(false));
  }, [testId]);

  // Timer
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
      const res = await fetch("/api/attempts", {
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

  async function handleSubmit(auto = false, violated = false) {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    const answersArr = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      const res = await fetch(`/api/attempts/${attemptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersArr,
          violations,
          action: "submit",
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
  }, [attemptId, answers, violations, submitting]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function parseOptions(options: string | null): string[] {
    if (!options) return [];
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return options.split("\n").filter(Boolean);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading test...</p>
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
            onClick={() => router.push("/student/tests")}
            className="mt-4 text-sm text-indigo-600 hover:underline"
          >
            Back to tests
          </button>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Test Submitted</h1>
          <p className="text-slate-500 mb-6">{test?.title}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{result.score?.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-slate-900">{result.percentage?.toFixed(0)}%</p>
              <p className="text-xs text-slate-500">Percentage</p>
            </div>
          </div>
          {violations.length > 0 && (
            <p className="text-sm text-amber-600 mb-4">
              {violations.length} proctoring violation(s) recorded
            </p>
          )}
          <button
            onClick={() => router.push("/student")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-lg w-full shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">{test?.title}</h1>
          {test?.description && (
            <p className="text-sm text-slate-500 mb-4">{test.description}</p>
          )}
          <div className="space-y-2 text-sm text-slate-600 mb-6">
            <p>Duration: <strong>{test?.durationMinutes} minutes</strong></p>
            <p>Total Marks: <strong>{test?.totalMarks}</strong></p>
            <p>Questions: <strong>{test?.questions?.length || 0}</strong></p>
            {test?.isProctored && (
              <p className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                This is a <strong>proctored</strong> test. Fullscreen is required. Tab switching will be recorded.
              </p>
            )}
          </div>
          {(test?.questions?.length || 0) === 0 && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
              This test has no questions yet. Please contact your admin to attach questions from a Question Bank.
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}
          {(() => {
            const live = test ? checkTestLive(test) : { live: false, reason: "Loading..." };
            if (!live.live) {
              return (
                <div className="space-y-3">
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {live.reason || "This test is not live yet."}
                  </div>
                  {(live.opensAt || live.closesAt) && (
                    <p className="text-xs text-slate-500">
                      {live.opensAt && <>Opens: {live.opensAt}<br /></>}
                      {live.closesAt && <>Closes: {live.closesAt}</>}
                    </p>
                  )}
                  <button disabled className="w-full bg-slate-300 text-slate-600 font-medium py-2.5 rounded-lg cursor-not-allowed">
                    Test not live
                  </button>
                </div>
              );
            }
            return (
              <button
                onClick={startAttempt}
                disabled={(test?.questions?.length || 0) === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg"
              >
                Start Test
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  // Test taking UI
  const content = (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{test?.title}</p>
          <p className="text-xs text-slate-500">
            {Object.keys(answers).length} / {test?.questions?.length || 0} answered
          </p>
        </div>
        <div className="flex items-center gap-4">
          {violations.length > 0 && (
            <span className="text-xs text-red-600 font-medium">
              {violations.length} violation(s)
            </span>
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
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {(!test?.questions || test.questions.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="font-medium text-amber-900">No questions in this test</p>
            <p className="text-sm text-amber-700 mt-1">
              Ask your admin to open <strong>Tests</strong>, edit this test, and attach questions from a Question Bank.
            </p>
          </div>
        )}

        {test?.questions?.map((tq: Question, idx: number) => {
          const opts = parseOptions(tq.question.options);
          return (
            <div key={tq.question.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-slate-900 font-medium">{tq.question.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{tq.marks} mark(s) · {tq.question.type}</p>
                </div>
              </div>

              {tq.question.type === "SHORT_ANSWER" ? (
                <input
                  type="text"
                  value={answers[tq.question.id] || ""}
                  onChange={(e) =>
                    setAnswers({ ...answers, [tq.question.id]: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your answer..."
                />
              ) : opts.length === 0 ? (
                <p className="text-sm text-slate-400 ml-10">No options defined for this question.</p>
              ) : (
                <div className="space-y-2 ml-10">
                  {opts.map((opt, oi) => (
                    <label
                      key={`${tq.question.id}-${oi}-${opt}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[tq.question.id] === opt
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={tq.question.id}
                        value={opt}
                        checked={answers[tq.question.id] === opt}
                        onChange={() =>
                          setAnswers({ ...answers, [tq.question.id]: opt })
                        }
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pb-8">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting || !test?.questions?.length}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-xl"
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
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
