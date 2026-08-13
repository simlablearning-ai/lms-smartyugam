"use client";

import { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CollegeJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/placement/jobs/${jobId}`).then((r) => r.json());
    setData(d.error ? null : d);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [jobId]);

  async function block(studentId: string, name: string) {
    const reason = prompt(`Reason to restrict ${name} from this job?`) || "Restricted by college";
    await fetch("/api/placement/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, studentId, reason }),
    });
    load();
  }

  async function unblock(studentId: string) {
    await fetch(`/api/placement/blocks?jobId=${jobId}&studentId=${studentId}`, { method: "DELETE" });
    load();
  }

  const blockSet = new Set((data?.blocks || []).map((b: any) => b.studentId));
  // College admin: only their students
  const apps = (data?.applications || []);

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-6">
        <div>
          <Link href="/college-admin/placement" className="text-sm text-slate-500 inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Placement
          </Link>
          <h1 className="font-display text-xl font-medium text-[#1a1814]">{data?.job?.title}</h1>
          <p className="text-sm text-[#6b6560]">{data?.job?.companyName}</p>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Dept</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-right px-4 py-3">Restrict</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading...</td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No applicants from view yet</td></tr>
              ) : (
                apps.map((a: any) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.student?.name}</p>
                      <p className="text-xs text-slate-400">{a.student?.rollNumber ? `${a.student.rollNumber} · ` : ""}{a.student?.email}</p>
                      {a.appSkills && <p className="text-[11px] text-[#6b6560] mt-0.5">Skills: {a.appSkills}</p>}
                      {(a.appResume || a.student?.placementProfile?.resumeUrl) && (
                        <a className="text-[11px] text-[#c45c26] font-medium" href={a.appResume || a.student?.placementProfile?.resumeUrl} target="_blank" rel="noreferrer">
                          Resume
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{a.student?.department?.code} · Y{a.student?.year}</td>
                    <td className="px-4 py-3 text-xs">{a.status}</td>
                    <td className="px-4 py-3">{a.score ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {blockSet.has(a.studentId) ? (
                        <button onClick={() => unblock(a.studentId)} className="text-xs text-emerald-600">
                          Unrestrict
                        </button>
                      ) : (
                        <button onClick={() => block(a.studentId, a.student?.name)} className="text-xs text-red-600">
                          Restrict
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
