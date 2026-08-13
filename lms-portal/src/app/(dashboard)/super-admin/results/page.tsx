"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ClipboardList, Search, ChevronRight, Users } from "lucide-react";
import Link from "next/link";

export default function ResultsHubPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/colleges")
      .then((r) => r.json())
      .then((d) => setColleges(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = collegeFilter ? `?collegeId=${collegeFilter}` : "";
    fetch(`/api/results${q}`)
      .then((r) => r.json())
      .then((d) => setTests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [collegeFilter]);

  const filtered = tests.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results</h1>
          <p className="text-slate-500 mt-1">View student attempts, scores, and answer analysis per test</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Test</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">College</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Submitted</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Violated</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Avg %</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No tests found</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <ClipboardList className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-400">{t._count?.questions ?? 0} questions · {t.status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.college?.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{t.resultStats?.submitted ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600">{t.resultStats?.violated ?? 0}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {t.resultStats?.avgPct ? `${Math.round(t.resultStats.avgPct)}%` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/super-admin/results/${t.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        View results <ChevronRight className="h-4 w-4" />
                      </Link>
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
