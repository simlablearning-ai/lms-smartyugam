"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Search, UserCog } from "lucide-react";

export default function SuperAdminFacultyPage() {
  return <FacultyAdminPage role="SUPER_ADMIN" />;
}

export function FacultyAdminPage({ role }: { role: "SUPER_ADMIN" | "COLLEGE_ADMIN" }) {
  const [list, setList] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    collegeId: "",
    courseIds: [] as string[],
  });

  async function load() {
    setLoading(true);
    const q = collegeFilter ? `?collegeId=${collegeFilter}` : "";
    const [f, c] = await Promise.all([
      fetch(`/api/faculty${q}`).then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ]);
    setList(Array.isArray(f) ? f : []);
    setCourses(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (role === "SUPER_ADMIN") {
      fetch("/api/colleges")
        .then((r) => r.json())
        .then((d) => setColleges(Array.isArray(d) ? d : []));
    }
  }, [collegeFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      password: "123456",
      collegeId: colleges[0]?.id || "",
      courseIds: [],
    });
    setError("");
    setModal(true);
  }

  function openEdit(f: any) {
    setEditing(f);
    setForm({
      name: f.name,
      email: f.email || "",
      password: "",
      collegeId: f.collegeId || "",
      courseIds: (f.facultyAssignments || []).map((a: any) => a.courseId || a.course?.id),
    });
    setError("");
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        collegeId: form.collegeId || undefined,
        courseIds: form.courseIds,
      };
      if (form.password) payload.password = form.password;
      const res = await fetch(editing ? `/api/faculty/${editing.id}` : "/api/faculty", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setSaving(false);
        return;
      }
      setModal(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Deactivate faculty "${name}"?`)) return;
    await fetch(`/api/faculty/${id}`, { method: "DELETE" });
    load();
  }

  const filtered = list.filter(
    (f) =>
      !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase())
  );

  const coursesForForm =
    role === "SUPER_ADMIN" && form.collegeId
      ? courses.filter((c) => c.collegeId === form.collegeId)
      : courses;

  return (
    <DashboardShell role={role}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Faculty</h1>
            <p className="text-slate-500 mt-1">Create faculty and assign courses (many-to-many)</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <Plus className="h-4 w-4" /> Add Faculty
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          {role === "SUPER_ADMIN" && (
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">All colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-6 py-3 font-medium text-slate-600">Faculty</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">College</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Courses</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No faculty yet
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                          <UserCog className="h-4 w-4 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{f.name}</p>
                          <p className="text-xs text-slate-500">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{f.college?.name || "—"}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {(f.facultyAssignments || []).map((a: any) => a.course?.title).filter(Boolean).join(", ") ||
                        "—"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(f.id, f.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Faculty" : "Add Faculty"}>
          <form onSubmit={save} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (login)</label>
              <input required type="email" disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{editing ? "New password (optional)" : "Password"}</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder={editing ? "Leave blank to keep" : "123456"} />
            </div>
            {role === "SUPER_ADMIN" && !editing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
                <select required value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value, courseIds: [] })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg">
                  <option value="">Select</option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned courses</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                {coursesForForm.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No courses</p>
                ) : (
                  coursesForForm.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={form.courseIds.includes(c.id)}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            courseIds: e.target.checked
                              ? [...f.courseIds, c.id]
                              : f.courseIds.filter((id) => id !== c.id),
                          }))
                        }
                      />
                      {c.title}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-lg border">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-50">{saving ? "Saving..." : editing ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardShell>
  );
}
