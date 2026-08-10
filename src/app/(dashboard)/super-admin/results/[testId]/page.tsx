"use client";

import { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { formatIst } from "@/lib/test-live";

export default function TestResultsPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    const q = deptFilter ? `?testId=${testId}&departmentId=${deptFilter}` : `?testId=${testId}`;
    const d = await fetch(`/api/results${q}`).then((r) => r.json());
    setData(d.error ? null : d);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [testId, deptFilter]);

  async function viewAttempt(id: string) {
    setDetailLoading(true);
    setDetail(null);
    const d = await fetch(`/api/results/${id}`).then((r) => r.json());
    if (!d.error) setDetail(d);
    setDetailLoading(false);
  }

  async function resetAttempt(id: string, name: string) {
    if (!confirm(`Reset attempt for ${name}? They will be able to take the test again.`)) return;
    const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDetail(null);
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Reset failed");
    }
  }

  function exportCsv() {
    if (!data?.attempts?.length) return;
    const rows = [
      ["Student", "Email", "Dept", "Year", "Score", "Percentage", "Status", "Violations", "Submitted"],
      ...data.attempts.map((a: any) => [
        a.student?.name,
        a.student?.email,
        a.student?.department?.code || "",
        a.student?.year || "",
        a.score ?? "",
        a.percentage ?? "",
        a.status,
        a.violationCount,
        a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${data.test?.title || testId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const depts = Array.from(
    new Map(
      (data?.attempts || [])
        .filter((a: any) => a.student?.department)
        .map((a: any) => [a.student.department.id, a.student.department])
    ).values()
  ) as any[];

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/super-admin/results" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to Results
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">{data?.test?.title || "Test results"}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {data?.test?.college?.name}
              {data?.test?.department ? ` · ${data.test.department.name}` : ""}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">All Departments</option>
              {depts.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Dept</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">%</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Violations</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : !data?.attempts?.length ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No attempts yet</td></tr>
                ) : (
                  data.attempts.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.student?.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{a.student?.email}</td>
                      <td className="px-4 py-3">
                        {a.student?.department && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                            {a.student.department.code || a.student.department.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">{a.score != null ? Number(a.score).toFixed(0) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${(a.percentage || 0) >= 40 ? "text-emerald-600" : "text-red-600"}`}>
                          {a.percentage != null ? `${Number(a.percentage).toFixed(0)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{a.violationCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.status === "VIOLATED"
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {a.submittedAt ? formatIst(a.submittedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => viewAttempt(a.id)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 mr-2"
                        >
                          View
                        </button>
                        <button
                          onClick={() => resetAttempt(a.id, a.student?.name)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={!!detail || detailLoading}
        onClose={() => setDetail(null)}
        title={detail ? `Results: ${detail.student?.name}` : "Loading..."}
        size="lg"
      >
        {detailLoading && <p className="text-center text-slate-500 py-8">Loading...</p>}
        {detail && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{detail.score ?? "—"}</p>
                <p className="text-xs text-slate-500">Score</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{detail.percentage != null ? `${Number(detail.percentage).toFixed(0)}%` : "—"}</p>
                <p className="text-xs text-slate-500">Percentage</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold">{Array.isArray(detail.violations) ? detail.violations.length : 0}</p>
                <p className="text-xs text-slate-500">Violations</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className={`text-sm font-bold ${detail.status === "VIOLATED" ? "text-red-600" : "text-emerald-600"}`}>
                  {detail.status}
                </p>
                <p className="text-xs text-slate-500">Status</p>
              </div>
            </div>

            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="text-slate-400">Email:</span> {detail.student?.email}</p>
              <p><span className="text-slate-400">Dept:</span> {detail.student?.department?.name || "—"}</p>
              <p><span className="text-slate-400">Started:</span> {detail.startedAt ? formatIst(detail.startedAt) : "—"}</p>
              <p><span className="text-slate-400">Submitted:</span> {detail.submittedAt ? formatIst(detail.submittedAt) : "—"}</p>
              <p><span className="text-slate-400">Duration:</span> {detail.timeSpentSec != null ? `${Math.floor(detail.timeSpentSec / 60)}m ${detail.timeSpentSec % 60}s` : "—"}</p>
            </div>

            {Array.isArray(detail.violations) && detail.violations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-2">Violations log</h3>
                <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
                  {detail.violations.map((v: any, i: number) => (
                    <li key={i} className="bg-red-50 border border-red-100 rounded px-2 py-1">
                      {v.type} · {v.timestamp ? formatIst(v.timestamp) : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Answer analysis</h3>
              <div className="space-y-4">
                {(detail.answers || []).map((a: any, idx: number) => (
                  <div key={a.id} className="border border-slate-200 rounded-xl p-4">
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
                    <p className="text-sm text-slate-800 mb-3">{a.question?.text}</p>
                    {a.question?.optionsList?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {a.question.optionsList.map((opt: string, oi: number) => {
                          const selected = a.answer === opt || a.answer === String(oi) || a.answer === String.fromCharCode(65 + oi);
                          const isCorrectOpt =
                            opt === a.question.correctAnswer ||
                            String(oi) === a.question.correctAnswer ||
                            String.fromCharCode(65 + oi) === a.question.correctAnswer;
                          return (
                            <div
                              key={oi}
                              className={`text-xs px-3 py-2 rounded-lg border ${
                                isCorrectOpt
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : selected
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-slate-50 border-slate-100"
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                              {selected && <span className="ml-2 font-semibold">SELECTED</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!a.question?.optionsList?.length && (
                      <p className="text-xs text-slate-600">
                        Answer: <strong>{a.answer || "—"}</strong> · Correct: {a.question?.correctAnswer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => resetAttempt(detail.id, detail.student?.name)}
              className="w-full border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium py-2.5 rounded-lg"
            >
              Reset this attempt
            </button>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
