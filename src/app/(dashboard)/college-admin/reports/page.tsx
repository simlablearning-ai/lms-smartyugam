"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BarChart3, Users, ClipboardList, TrendingUp, Filter } from "lucide-react";

export default function CollegeReportsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    departmentId: "",
    year: "",
    testId: "",
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"summary" | "department" | "year" | "student">("summary");

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(Array.isArray(d) ? d : []));
    fetch("/api/tests")
      .then((r) => r.json())
      .then((d) => setTests(Array.isArray(d) ? d : []));
  }, []);

  async function generateReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.year) params.set("year", filters.year);
      if (filters.testId) params.set("testId", filters.testId);
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (res.ok) setReport(data);
      else alert(data.error || "Failed");
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">
            Department, Year & Individual student reports for your college
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Filters</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
              <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
              <select value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Test</label>
              <select value={filters.testId} onChange={(e) => setFilters({ ...filters, testId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All Tests</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={generateReport} disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg">
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>

        {report && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(["summary", "department", "year", "student"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                    view === v ? "bg-indigo-100 text-indigo-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  {v === "student" ? "Individual Students" : v + " Level"}
                </button>
              ))}
            </div>

            {view === "summary" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <Users className="h-5 w-5 text-indigo-600 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{report.summary.totalStudents}</p>
                  <p className="text-sm text-slate-500">Students</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <ClipboardList className="h-5 w-5 text-rose-500 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{report.summary.totalTests}</p>
                  <p className="text-sm text-slate-500">Tests</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <BarChart3 className="h-5 w-5 text-amber-500 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{report.summary.totalAttempts}</p>
                  <p className="text-sm text-slate-500">Attempts</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{report.summary.avgAttendance?.toFixed(0) || 0}%</p>
                  <p className="text-sm text-slate-500">Avg Attendance</p>
                </div>
              </div>
            )}

            {view === "department" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Department</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Students</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.departmentSummary?.map((d: any) => (
                      <tr key={d.departmentId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">{d.name}</td>
                        <td className="px-6 py-4">{d.students}</td>
                        <td className="px-6 py-4">{d.attempts}</td>
                        <td className="px-6 py-4">{d.avgScore?.toFixed(1) || "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === "year" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Year</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Students</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.yearSummary?.map((y: any) => (
                      <tr key={y.year} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">
                          {y.year ? `Year ${y.year}` : "Not set"}
                        </td>
                        <td className="px-6 py-4">{y.students}</td>
                        <td className="px-6 py-4">{y.attempts}</td>
                        <td className="px-6 py-4">{y.avgScore?.toFixed(1) || "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === "student" && (
              <div className="space-y-4">
                {report.studentReports?.map((sr: any) => (
                  <div key={sr.student.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{sr.student.name}</h3>
                        <p className="text-xs text-slate-500">
                          {sr.student.department?.name || "No Dept"} · Year {sr.student.year || "—"}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">
                        Attended: <strong>{sr.attendedCount}</strong>/{sr.totalTests} · Avg:{" "}
                        <strong>{sr.avgPercentage?.toFixed(0) ?? "—"}%</strong>
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-1">Attended</p>
                        {sr.attended.length === 0 ? (
                          <p className="text-xs text-slate-400">None</p>
                        ) : (
                          sr.attended.map((a: any) => (
                            <div key={a.testId} className="flex justify-between py-0.5">
                              <span className="truncate">{a.testTitle}</span>
                              <span className={a.passed ? "text-emerald-600" : "text-rose-600"}>
                                {a.percentage?.toFixed(0)}%
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-rose-700 mb-1">Not Attended</p>
                        {sr.notAttended.length === 0 ? (
                          <p className="text-xs text-slate-400">None</p>
                        ) : (
                          sr.notAttended.map((t: any) => (
                            <p key={t.testId} className="text-slate-500 truncate">{t.testTitle}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!report && !loading && (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Select filters and click <strong>Generate Report</strong>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
