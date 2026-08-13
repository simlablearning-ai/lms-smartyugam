"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { BookOpen, Plus, Pencil, Trash2, Search } from "lucide-react";

type Department = { id: string; name: string; code: string };
type Course = {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  passingScore: number;
  department: Department | null;
  _count: { enrollments: number; tests: number };
};

export default function CollegeCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "",
    code: "",
    description: "",
    departmentId: "",
    passingScore: "40",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/departments"),
      ]);
      const cs = await cRes.json();
      setCourses(Array.isArray(cs) ? cs : []);
      const _dRes = await dRes.json();
      setDepartments(Array.isArray(_dRes) ? _dRes : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", code: "", description: "", departmentId: "", passingScore: "40" });
    setError("");
    setModalOpen(true);
  }

  function openEdit(c: Course) {
    setEditing(c);
    setForm({
      title: c.title,
      code: c.code || "",
      description: c.description || "",
      departmentId: c.department?.id || "",
      passingScore: c.passingScore.toString(),
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/courses/${editing.id}` : "/api/courses";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
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
    if (!confirm(`Deactivate course "${title}"?`)) return;
    const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const filtered = courses.filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
            <p className="text-slate-500 mt-1">Manage courses in your college</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
            <Plus className="h-4 w-4" /> Add Course
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="search" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Course</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Department</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Students</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Tests</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No courses found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="font-medium text-slate-900">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{c.code || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{c.department?.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{c._count.enrollments}</td>
                    <td className="px-6 py-4 text-slate-600">{c._count.tests}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Course" : "Add Course"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing Score %</label>
              <input type="number" min="0" max="100" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
