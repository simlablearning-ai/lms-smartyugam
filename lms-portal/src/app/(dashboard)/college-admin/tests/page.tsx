"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { ClipboardList, Plus, Trash2, Search, Shield } from "lucide-react";

type Test = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  isProctored: boolean;
  maxAttempts: number;
  department?: { name: string } | null;
  _count: { attempts: number; questions: number };
};

export default function CollegeTestsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    durationMinutes: "60",
    totalMarks: "100",
    passingMarks: "40",
    isProctored: true,
    status: "PUBLISHED",
    maxAttempts: "2",
    questionIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [tRes, dRes, qRes] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/departments"),
        fetch("/api/questions"),
      ]);
      const ts = await tRes.json();
      setTests(Array.isArray(ts) ? ts : []);
      const _dRes = await dRes.json();
      setDepartments(Array.isArray(_dRes) ? _dRes : []);
      const _qRes = await qRes.json();
      setQuestions(Array.isArray(_qRes) ? _qRes : []);
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({
      title: "",
      description: "",
      departmentId: "",
      durationMinutes: "60",
      totalMarks: "100",
      passingMarks: "40",
      isProctored: true,
      status: "PUBLISHED",
      maxAttempts: "2",
      questionIds: [],
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Permanently delete test "${title}"?`)) return;
    const res = await fetch(`/api/tests/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedIds((s) => s.filter((x) => x !== id));
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Delete failed");
    }
  }
  function toggleSelect(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleSelectAll(ids: string[]) {
    setSelectedIds((s) => (s.length === ids.length ? [] : ids));
  }
  async function bulkDelete() {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} test(s)?`)) return;
    const res = await fetch("/api/tests/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed");
      return;
    }
    setSelectedIds([]);
    load();
  }

  async function toggleStatus(id: string, current: string) {
    const newStatus = current === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/tests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  const filtered = tests.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tests / Assessments</h1>
            <p className="text-slate-500 mt-1">Create and manage tests for your college</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
            <Plus className="h-4 w-4" /> Create Test
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="search" placeholder="Search tests..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {selectedIds.length > 0 && (
          <div className="mb-3 flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
            <span className="text-sm text-red-800">{selectedIds.length} selected</span>
            <button type="button" onClick={bulkDelete} className="text-sm font-semibold text-white bg-red-600 px-3 py-1.5 rounded-lg">Delete selected</button>
          </div>
        )}
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={() => toggleSelectAll(filtered.map((x: any) => x.id))} className="rounded border-slate-300" />
                </th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Test</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Duration</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Questions</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No tests found.</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="rounded border-slate-300" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center">
                          <ClipboardList className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            {t.isProctored && <Shield className="h-3 w-3 text-amber-500" />}
                            {t.department?.name || ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.durationMinutes} min</td>
                    <td className="px-6 py-4 text-slate-600">{t._count.questions}</td>
                    <td className="px-6 py-4 text-slate-600">{t._count.attempts}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleStatus(t.id, t.status)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {t.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <button onClick={() => handleDelete(t.id, t.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Test" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Marks</label>
              <input type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing Marks</label>
              <input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Attempts</label>
              <input type="number" min="1" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isProctored} onChange={(e) => setForm({ ...form, isProctored: e.target.checked })} />
            Proctored test
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Questions</label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {questions.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No questions yet. Add questions first.</p>
              ) : (
                questions.map((q) => (
                  <label key={q.id} className="flex items-start gap-2 text-sm p-1.5 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={form.questionIds.includes(q.id)}
                      onChange={(e) => {
                        if (e.target.checked) setForm({ ...form, questionIds: [...form.questionIds, q.id] });
                        else setForm({ ...form, questionIds: form.questionIds.filter((id) => id !== q.id) });
                      }}
                      className="mt-0.5"
                    />
                    <span className="line-clamp-2">{q.text}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg">
              {saving ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
