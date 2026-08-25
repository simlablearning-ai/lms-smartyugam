"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { useListPagination, ListPaginationBar } from "@/components/ui/ListPagination";
import {
  FolderOpen,
  Plus,
  Trash2,
  Search,
  FileQuestion,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type College = { id: string; name: string; code: string };
type Bank = {
  id: string;
  name: string;
  description: string | null;
  college: College | null;
  _count: { questions: number };
  createdAt: string;
};

export default function QuestionBanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", collegeId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewBank, setViewBank] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch("/api/question-banks"),
        fetch("/api/colleges"),
      ]);
      const bs = await bRes.json();
      const cs = await cRes.json();
      setBanks(Array.isArray(bs) ? bs : []);
      setColleges(Array.isArray(cs) ? cs : []);
    } catch {
      setBanks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/question-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          collegeId: form.collegeId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      setForm({ name: "", description: "", collegeId: "" });
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate question bank "${name}"?`)) return;
    const res = await fetch(`/api/question-banks/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function openBank(id: string) {
    setViewLoading(true);
    setViewBank(null);
    try {
      const res = await fetch(`/api/question-banks/${id}`);
      const data = await res.json();
      if (res.ok) setViewBank(data);
    } finally {
      setViewLoading(false);
    }
  }

  const filtered = banks.filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const {
    page,
    setPage,
    viewAll,
    setViewAll,
    pageItems,
    total,
    totalPages,
    from,
    to,
  } = useListPagination(filtered, 20);

return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Question Banks</h1>
            <p className="text-slate-500 mt-1">
              Named sets of questions you can reuse across tests and colleges
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/questions"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50"
            >
              <FileQuestion className="h-4 w-4" /> All Questions
            </Link>
            <button
              onClick={() => {
                setForm({ name: "", description: "", collegeId: "" });
                setError("");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
            >
              <Plus className="h-4 w-4" /> New Bank
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search banks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Bank</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Scope</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Questions</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No question banks yet. Create one, then bulk-upload questions into it from the
                    Question Bank page.
                  </td>
                </tr>
              ) : (
                pageItems.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                          <FolderOpen className="h-4 w-4 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{b.name}</p>
                          {b.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{b.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {b.college?.name || (
                        <span className="text-indigo-600 text-xs font-medium">Global (all colleges)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{b._count.questions}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openBank(b.id)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-3"
                      >
                        View <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Question Bank">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. CSE Sem 1 – Data Structures"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              College (optional)
            </label>
            <select
              value={form.collegeId}
              onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Global – reusable for any college</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Leave Global to use this bank when creating tests for any college.
            </p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!viewBank || viewLoading}
        onClose={() => setViewBank(null)}
        title={viewBank?.name || "Question Bank"}
        size="lg"
      >
        {viewLoading ? (
          <p className="text-slate-500 py-8 text-center">Loading...</p>
        ) : viewBank ? (
          <div className="space-y-4">
            {viewBank.description && (
              <p className="text-sm text-slate-600">{viewBank.description}</p>
            )}
            <p className="text-xs text-slate-500">
              {viewBank._count?.questions ?? viewBank.questions?.length ?? 0} questions ·{" "}
              {viewBank.college?.name || "Global"}
            </p>
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {(viewBank.questions || []).length === 0 ? (
                <p className="p-4 text-sm text-slate-400 text-center">
                  No questions yet. Use Bulk Upload on the Questions page and set this bank name.
                </p>
              ) : (
                viewBank.questions.map((q: any) => (
                  <div key={q.id} className="px-4 py-3 text-sm">
                    <p className="text-slate-800 line-clamp-2">{q.text}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {q.type} · {q.marks} mark(s) · Difficulty {q.difficulty}/5
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewBank(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardShell>
  );
}
