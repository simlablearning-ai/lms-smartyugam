"use client";

/** Shared answer review chips — only one YOUR ANSWER and one CORRECT */

export function AnswerAnalysis({ answers }: { answers: any[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Answer analysis</h3>
      <div className="space-y-4">
        {(answers || []).map((a: any, idx: number) => (
          <div key={a.id || idx} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500">Q{idx + 1}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {a.isCorrect ? "CORRECT" : "WRONG"}
              </span>
            </div>
            <p className="text-sm text-slate-800 mb-2">{a.question?.text}</p>
            {a.question?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={a.question.imageUrl}
                alt=""
                className="mb-3 max-h-40 rounded border border-slate-200 object-contain"
              />
            ) : null}
            {a.question?.optionsList?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {a.question.optionsList.map((opt: string, oi: number) => {
                  const letter = String.fromCharCode(65 + oi);
                  const ans = String(a.answer ?? "").trim();
                  const correct = String(a.question.correctAnswer ?? "").trim();
                  const optT = String(opt ?? "").trim();
                  // Strict: exact option text, or single letter A-D only
                  const selected =
                    !!ans &&
                    (ans === optT || (/^[A-Da-d]$/.test(ans) && ans.toUpperCase() === letter));
                  const isCorrectOpt =
                    !!correct &&
                    (correct === optT ||
                      (/^[A-Da-d]$/.test(correct) && correct.toUpperCase() === letter));
                  let cls = "bg-slate-50 border-slate-100 text-slate-600";
                  let tag: string | null = null;
                  if (isCorrectOpt && selected) {
                    cls = "bg-emerald-50 border-emerald-300 text-emerald-900";
                    tag = "YOUR ANSWER ✓";
                  } else if (isCorrectOpt) {
                    cls = "bg-emerald-50 border-emerald-200 text-emerald-800";
                    tag = "CORRECT";
                  } else if (selected) {
                    cls = "bg-amber-50 border-amber-300 text-amber-900";
                    tag = "YOUR ANSWER";
                  }
                  return (
                    <div key={oi} className={`text-xs px-3 py-2 rounded-lg border ${cls}`}>
                      {letter}. {opt}
                      {tag ? <span className="ml-2 font-semibold">{tag}</span> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Answer: <strong>{a.answer || "—"}</strong> · Correct:{" "}
                {a.question?.correctAnswer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
