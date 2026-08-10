"use client";

import { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JobApplicantsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [interviewForm, setInterviewForm] = useState({
    interviewRound: "Round 1",
    interviewAt: "",
    interviewInfo: "",
    status: "INTERVIEW",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/placement/jobs/${jobId}`).then((r) => r.json());
    setData(d.error ? null : d);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [jobId]);

  async function updateStatus(appId: string, status: string) {
    await fetch(`/api/placement/applications/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function sendInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/placement/applications/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: interviewForm.status,
        interviewRound: interviewForm.interviewRound,
        interviewAt: interviewForm.interviewAt || null,
        interviewInfo: interviewForm.interviewInfo,
      }),
    });
    setSaving(false);
    setSelected(null);
    load();
  }

  const apps = (data?.applications || []).filter(
    (a: any) => !statusFilter || a.status === statusFilter
  );

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div>
          <Link href="/super-admin/placement" className="text-sm text-slate-500 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Jobs
          </Link>
          <h1 className="font-display text-2xl font-medium text-[#1a1814]">{data?.job?.title || "Applicants"}</h1>
          <p className="text-[#6b6560] text-sm">
            {data?.job?.companyName} · {data?.job?._count?.applications ?? apps.length} applications
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg"
          >
            <option value="">All statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="INTERVIEW">Interview</option>
            <option value="SELECTED">Selected / Placed</option>
            <option value="REJECTED">Rejected</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">College / Dept</th>
                <th className="text-left px-4 py-3">CGPA</th>
                <th className="text-left px-4 py-3">Skills</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Learning</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No applicants</td></tr>
              ) : (
                apps.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.student?.name}</p>
                      <p className="text-xs text-slate-400">{a.student?.email}</p>
                      {a.appHeadline && <p className="text-[11px] text-[#c45c26] mt-0.5">{a.appHeadline}</p>}
                      {a.coverLetter && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.coverLetter}</p>}
                      {(a.appResume || a.student?.placementProfile?.resumeUrl) && (
                        <a
                          className="text-[11px] text-indigo-600 font-medium"
                          href={a.appResume || a.student?.placementProfile?.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {a.resumeFileName || "View resume"}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a.student?.college?.name}
                      <br />
                      {a.student?.department?.code} · Y{a.student?.year}
                    </td>
                    <td className="px-4 py-3">{a.student?.placementProfile?.cgpa ?? "—"}</td>
                    <td className="px-4 py-3 text-xs max-w-[140px] truncate" title={a.student?.placementProfile?.skills}>
                      {a.appSkills || a.student?.placementProfile?.skills || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">{a.score ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {a.learningAvg != null ? `${Math.round(a.learningAvg)}% avg` : "—"}
                      <br />
                      {a.testsTaken || 0} tests
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button onClick={() => updateStatus(a.id, "SHORTLISTED")} className="text-xs text-indigo-600">Shortlist</button>
                      <button
                        onClick={() => {
                          setSelected(a);
                          setInterviewForm({
                            interviewRound: a.interviewRound || "Round 1",
                            interviewAt: a.interviewAt ? new Date(a.interviewAt).toISOString().slice(0, 16) : "",
                            interviewInfo: a.interviewInfo || "",
                            status: "INTERVIEW",
                          });
                        }}
                        className="text-xs text-violet-600"
                      >
                        Interview
                      </button>
                      <button onClick={() => updateStatus(a.id, "SELECTED")} className="text-xs text-emerald-600">Select</button>
                      <button onClick={() => updateStatus(a.id, "REJECTED")} className="text-xs text-red-600">Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Interview – ${selected?.student?.name || ""}`}>
        <form onSubmit={sendInterview} className="space-y-3">
          <p className="text-sm text-slate-600">
            {selected?.student?.email} · Score {selected?.score}
            {selected?.student?.placementProfile?.resumeUrl && (
              <> · <a className="text-indigo-600" href={selected.student.placementProfile.resumeUrl} target="_blank" rel="noreferrer">Resume</a></>
            )}
          </p>
          <input
            value={interviewForm.interviewRound}
            onChange={(e) => setInterviewForm({ ...interviewForm, interviewRound: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Round name"
          />
          <input
            type="datetime-local"
            value={interviewForm.interviewAt}
            onChange={(e) => setInterviewForm({ ...interviewForm, interviewAt: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <textarea
            rows={4}
            value={interviewForm.interviewInfo}
            onChange={(e) => setInterviewForm({ ...interviewForm, interviewInfo: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Interview details (venue, meet link, instructions…)"
          />
          <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white text-sm py-2.5 rounded-lg">
            {saving ? "Saving..." : "Save interview details"}
          </button>
        </form>
      </Modal>
    </DashboardShell>
  );
}
