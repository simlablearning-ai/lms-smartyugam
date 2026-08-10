"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BarChart3, Users, ClipboardList, TrendingUp, Filter, Download } from "lucide-react";

type College = { id: string; name: string; code: string };
type Department = { id: string; name: string; code: string; college?: College };
type Test = { id: string; title: string };

export default function ReportsPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [filters, setFilters] = useState({
    collegeId: "",
    departmentId: "",
    year: "",
    testId: "",
  });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"summary" | "department" | "year" | "student">("summary");

  useEffect(() => {
    Promise.all([
      fetch("/api/colleges").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([cols, depts]) => {
      setColleges(Array.isArray(cols) ? cols : []);
      setDepartments(Array.isArray(depts) ? depts : []);
    });
  }, []);

  useEffect(() => {
    // Load tests when college/dept changes
    const params = new URLSearchParams();
    if (filters.collegeId) params.set("collegeId", filters.collegeId);
    // Tests endpoint may not exist yet – handle gracefully
    fetch(`/api/tests?${params}`)
      .then((r) => r.json())
      .then((data) => setTests(Array.isArray(data) ? data : []))
      .catch(() => setTests([]));
  }, [filters.collegeId, filters.departmentId]);

  async function generateReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.collegeId) params.set("collegeId", filters.collegeId);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.year) params.set("year", filters.year);
      if (filters.testId) params.set("testId", filters.testId);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (res.ok) setReport(data);
      else alert(data.error || "Failed to generate report");
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    const params = new URLSearchParams();
    if (filters.collegeId) params.set("collegeId", filters.collegeId);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.year) params.set("year", filters.year);
    if (filters.testId) params.set("testId", filters.testId);
    window.open(`/api/reports/export?${params}`, "_blank");
  }

  const filteredDepts = departments.filter(
    (d) => !filters.collegeId || (d as any).college?.id === filters.collegeId
  );

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">
            Multi-level reports with filters – College → Year → Department → Test
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Filters</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">College</label>
              <select
                value={filters.collegeId}
                onChange={(e) =>
                  setFilters({ ...filters, collegeId: e.target.value, departmentId: "", testId: "" })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Colleges</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
              <select
                value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value, testId: "" })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {filteredDepts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Test</label>
              <select
                value={filters.testId}
                onChange={(e) => setFilters({ ...filters, testId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Tests</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Download CSV
            </button>
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>

        {/* View tabs */}
        {report && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(["summary", "department", "year", "student"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                    view === v
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {v === "student" ? "Individual Students" : v + " Level"}
                </button>
              ))}
            </div>

            {/* Summary cards */}
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
                  <p className="text-2xl font-bold text-slate-900">
                    {report.summary.avgAttendance?.toFixed(0) || 0}%
                  </p>
                  <p className="text-sm text-slate-500">Avg Attendance</p>
                </div>
              </div>
            )}

            {/* Department level */}
            {view === "department" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Department</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Students</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.departmentSummary?.map((d: any) => (
                      <tr key={d.departmentId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{d.name}</td>
                        <td className="px-6 py-4 text-slate-600">{d.students}</td>
                        <td className="px-6 py-4 text-slate-600">{d.attempts}</td>
                        <td className="px-6 py-4 text-slate-600">{d.avgScore?.toFixed(1) || "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Year level */}
            {view === "year" && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Year</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Students</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                      <th className="text-left px-6 py-3 font-medium text-slate-600">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.yearSummary?.map((y: any) => (
                      <tr key={y.year} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {y.year ? `${y.year}${y.year === 1 ? "st" : y.year === 2 ? "nd" : y.year === 3 ? "rd" : "th"} Year` : "Not set"}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{y.students}</td>
                        <td className="px-6 py-4 text-slate-600">{y.attempts}</td>
                        <td className="px-6 py-4 text-slate-600">{y.avgScore?.toFixed(1) || "—"}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Individual student */}
            {view === "student" && (
              <div className="space-y-4">
                {report.studentReports?.map((sr: any) => (
                  <div key={sr.student.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">{sr.student.name}</h3>
                        <p className="text-xs text-slate-500">
                          {sr.student.email} · {sr.student.department?.name || "No Dept"} ·{" "}
                          {sr.student.year ? `Year ${sr.student.year}` : ""}
                        </p>
                      </div>
                      <div className="text-sm text-slate-600">
                        Attended: <strong>{sr.attendedCount}</strong> / {sr.totalTests} · Avg:{" "}
                        <strong>{sr.avgPercentage?.toFixed(0) ?? "—"}%</strong>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-2">Attended Tests</p>
                        {sr.attended.length === 0 ? (
                          <p className="text-xs text-slate-400">None</p>
                        ) : (
                          <ul className="space-y-1">
                            {sr.attended.map((a: any) => (
                              <li key={a.testId} className="text-sm flex justify-between gap-2">
                                <span className="text-slate-700 truncate">{a.testTitle}</span>
                                <span className={`font-medium ${a.passed ? "text-emerald-600" : "text-rose-600"}`}>
                                  {a.percentage?.toFixed(0)}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-rose-700 mb-2">Not Attended</p>
                        {sr.notAttended.length === 0 ? (
                          <p className="text-xs text-slate-400">None</p>
                        ) : (
                          <ul className="space-y-1">
                            {sr.notAttended.map((t: any) => (
                              <li key={t.testId} className="text-sm text-slate-500 truncate">
                                {t.testTitle}
                              </li>
                            ))}
                          </ul>
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
            Select filters and click <strong>Generate Report</strong> to view results.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
