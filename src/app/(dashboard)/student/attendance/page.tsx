"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CalendarCheck } from "lucide-react";

export default function StudentAttendancePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
          <p className="text-slate-500 mt-1">Class sessions and tests you submitted</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Type</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Details</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No attendance records yet</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-3">{String(r.date).slice(0, 10)}</td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {r.source === "CODING_TEST" ? "Coding test" : r.source === "TEST" ? "MCQ test" : "Class"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {r.course?.title || r.test?.title || r.techTest?.title || "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span className={r.status === "PRESENT" ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                        {r.status}
                      </span>
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
