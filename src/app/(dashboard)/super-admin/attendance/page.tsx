"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function SuperAdminAttendancePage() {
  return <AttendanceReportPage role="SUPER_ADMIN" />;
}

export function AttendanceReportPage({ role }: { role: "SUPER_ADMIN" | "COLLEGE_ADMIN" }) {
  const [colleges, setColleges] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    collegeId: "",
    departmentId: "",
    courseId: "",
    source: "",
    from: "",
    to: "",
  });
  const [rows, setRows] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role === "SUPER_ADMIN") {
      fetch("/api/colleges").then((r) => r.json()).then((d) => setColleges(Array.isArray(d) ? d : []));
    }
    fetch("/api/courses").then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : []));
  }, [role]);

  async function apply() {
    if (role === "SUPER_ADMIN" && !filters.collegeId) {
      alert("Select a college first");
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.collegeId) params.set("collegeId", filters.collegeId);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.courseId) params.set("courseId", filters.courseId);
    if (filters.source) params.set("source", filters.source);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    const data = await fetch(`/api/attendance?${params}`).then((r) => r.json());
    setRows(Array.isArray(data) ? data : []);
    setLoaded(true);
    setLoading(false);
  }

  const courseOptions =
    role === "SUPER_ADMIN" && filters.collegeId
      ? courses.filter((c) => c.collegeId === filters.collegeId)
      : courses;

  return (
    <DashboardShell role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">
            Apply filters first. Class + test + coding test attendance.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {role === "SUPER_ADMIN" && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">College *</label>
                <select
                  value={filters.collegeId}
                  onChange={(e) => setFilters({ ...filters, collegeId: e.target.value, courseId: "" })}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                >
                  <option value="">Select college</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Course (optional)</label>
              <select
                value={filters.courseId}
                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              >
                <option value="">All courses</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              >
                <option value="">All (class + tests)</option>
                <option value="CLASS">Class only</option>
                <option value="TEST">MCQ tests</option>
                <option value="CODING_TEST">Coding tests</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={apply} disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {loading ? "Loading..." : "Apply filters"}
            </button>
          </div>
        </div>

        {!loaded ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Select filters and click <strong>Apply filters</strong>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Details</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No records</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">{String(r.date).slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.student?.name}</p>
                        <p className="text-xs text-slate-500">{r.student?.rollNumber}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{r.source}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.course?.title || r.test?.title || r.techTest?.title || "—"}
                      </td>
                      <td className={`px-4 py-3 font-medium ${r.status === "PRESENT" ? "text-emerald-600" : "text-red-600"}`}>
                        {r.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
