"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { useListPagination, ListPaginationBar } from "@/components/ui/ListPagination";
import { Users, Plus, Pencil, Trash2, Search, Upload, Download, BarChart3, FileSpreadsheet, KeyRound } from "lucide-react";
import { parseSpreadsheetFile, parseCsvText } from "@/lib/parse-spreadsheet";

type College = { id: string; name: string; code: string };
type Department = { id: string; name: string; code: string; college?: College };
type Student = {
  id: string;
  name: string;
  email: string;
  rollNumber: string | null;
  year: number | null;
  isActive: boolean;
  college: College | null;
  department: Department | null;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    rollNumber: "",
    collegeId: "",
    departmentId: "",
    year: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeFilter) params.set("collegeId", collegeFilter);
      if (yearFilter) params.set("year", yearFilter);

      const [stuRes, colRes, deptRes] = await Promise.all([
        fetch(`/api/students?${params}`),
        fetch("/api/colleges"),
        fetch("/api/departments"),
      ]);
      const stus = await stuRes.json();
      const cols = await colRes.json();
      const depts = await deptRes.json();
      setStudents(Array.isArray(stus) ? stus : []);
      setColleges(Array.isArray(cols) ? cols : []);
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [collegeFilter, yearFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      password: "123456",
      rollNumber: "",
      collegeId: colleges[0]?.id || "",
      departmentId: "",
      year: "1",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      name: s.name,
      email: s.email,
      rollNumber: s.rollNumber || "",
      password: "",
      collegeId: s.college?.id || "",
      departmentId: s.department?.id || "",
      year: s.year?.toString() || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/students/${editing.id}` : "/api/students";
      const method = editing ? "PUT" : "POST";
      const payload: any = { ...form };
      if (editing && !payload.password) delete payload.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function resetPassword(id: string, name: string) {
    const pwd = prompt(`New password for ${name} (default 123456):`, "123456");
    if (pwd === null) return;
    const res = await fetch(`/api/students/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd || "123456" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "Reset failed");
      return;
    }
    alert(`Password reset. Temporary password: ${d.temporaryPassword || pwd}`);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate student "${name}"?`)) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert("Failed");
  }

  async function onBulkFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setBulkFile(file);
    setBulkResult(null);
    setBulkPreview([]);
    if (!file) return;
    try {
      const rows = await parseSpreadsheetFile(file);
      setBulkPreview(rows);
      if (!rows.length) setBulkResult({ error: "No data rows found in file" });
    } catch (err: any) {
      setBulkResult({ error: err.message || "Failed to read file" });
      setBulkFile(null);
    }
  }

  async function handleBulkUpload() {
    setBulkSaving(true);
    setBulkResult(null);
    try {
      let students: any[] = bulkPreview;
      if (!students.length && bulkText.trim()) {
        const trimmed = bulkText.trim();
        students = trimmed.startsWith("[") ? JSON.parse(trimmed) : parseCsvText(trimmed);
      }
      if (!students.length) {
        setBulkResult({ error: "Upload a CSV/Excel file (or paste data). Need a header row." });
        setBulkSaving(false);
        return;
      }
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();
      setBulkResult(data);
      if (res.ok && data.created > 0) load();
    } catch (e: any) {
      setBulkResult({ error: e.message || "Parse/upload failed" });
    } finally {
      setBulkSaving(false);
    }
  }

  function downloadTemplate() {
    const csv = "name,rollNumber,password,collegeCode,departmentCode (auto-created if new),year,email\nJohn Doe,john@college.edu,password123,SYIT,CSE,1,CSE21B001\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openBulkModal() {
    setBulkOpen(true);
    setBulkText("");
    setBulkFile(null);
    setBulkPreview([]);
    setBulkResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function viewProgress(studentId: string) {
    setProgressLoading(true);
    setProgressOpen(true);
    setProgressData(null);
    try {
      const res = await fetch(`/api/progress?studentId=${studentId}`);
      const data = await res.json();
      if (res.ok) setProgressData(data);
      else setProgressData({ error: data.error || "Failed" });
    } catch {
      setProgressData({ error: "Network error" });
    } finally {
      setProgressLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  async function bulkDeleteStudents() {
    if (!selectedIds.length) return;
    if (!confirm(`Deactivate ${selectedIds.length} student(s)?`)) return;
    const res = await fetch("/api/students/bulk-delete", {
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

  const filteredDepts = departments.filter(
    (d) => !form.collegeId || (d as any).college?.id === form.collegeId || !d.college
  );

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.rollNumber || "").toLowerCase().includes(q)
    );
  });

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
            <h1 className="text-2xl font-bold text-slate-900">Students</h1>
            <p className="text-slate-500 mt-1">Manage students across colleges</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> CSV Template
            </button>
            <button
              onClick={openBulkModal}
              className="inline-flex items-center gap-2 border border-indigo-300 text-indigo-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-50"
            >
              <Upload className="h-4 w-4" /> Bulk Upload
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
            >
              <Plus className="h-4 w-4" /> Add Student
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <span className="text-sm text-red-800 font-medium">{selectedIds.length} selected</span>
            <button type="button" onClick={bulkDeleteStudents} className="text-sm font-semibold text-white bg-red-600 px-3 py-1.5 rounded-lg">Deactivate selected</button>
            <button type="button" onClick={() => setSelectedIds([])} className="text-sm text-red-700">Clear</button>
          </div>
        )}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 pt-3 pb-1 border-b border-slate-100">
            <ListPaginationBar
              page={page}
              setPage={setPage}
              viewAll={viewAll}
              setViewAll={setViewAll}
              total={total}
              totalPages={totalPages}
              from={from}
              to={to}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded border-slate-300"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={(e) => setSelectedIds(e.target.checked ? pageItems.map((x) => x.id) : [])}
                    />
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Roll No.</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">College</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Department</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Year</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No students found.</td></tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} className="rounded border-slate-300" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{s.rollNumber || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{s.email}</td>
                      <td className="px-6 py-4 text-slate-600">{s.college?.name || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">{s.department?.name || "—"}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {s.year ? `${s.year}${s.year === 1 ? "st" : s.year === 2 ? "nd" : s.year === 3 ? "rd" : "th"} Year` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => viewProgress(s.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600" title="Learning progress">
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => resetPassword(s.id, s.name)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700" title="Reset password">
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600" title="Deactivate">
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
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Student" : "Add Student"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Roll Number * (login username)</label>
              <input required value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                placeholder="e.g. CSE21B001"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password {editing ? "(leave blank to keep)" : "*"}
            </label>
            <input
              type="password"
              required={!editing}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={editing ? "Leave blank to keep current" : "Default: password123"}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">College *</label>
              <select required value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value, departmentId: "" })}
                disabled={!!editing}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select</option>
                {departments
                  .filter((d) => !form.collegeId || (d as any).college?.id === form.collegeId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
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

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Upload Students" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Upload <strong>Excel (.xlsx / .xls)</strong> or <strong>CSV</strong>. Columns:{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">name, email, password, collegeCode, departmentCode, year, rollNumber</code>
          </p>

          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {bulkFile ? bulkFile.name : "Click to choose file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">.csv, .xlsx, .xls</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={onBulkFileChange}
            />
          </div>

          {bulkPreview.length > 0 && (
            <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <strong>{bulkPreview.length}</strong> row(s) ready to upload
              <div className="mt-2 max-h-28 overflow-auto text-xs font-mono text-slate-500">
                {bulkPreview.slice(0, 5).map((r, i) => (
                  <div key={i}>{r.name || r.Name || "?"} · {r.email || r.Email || "?"}</div>
                ))}
                {bulkPreview.length > 5 && <div>…and {bulkPreview.length - 5} more</div>}
              </div>
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Or paste CSV / JSON</summary>
            <textarea
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkFile(null); setBulkPreview([]); }}
              rows={5}
              placeholder={"name,rollNumber,password,collegeCode,departmentCode,year,email\nJohn Doe,john@syit.edu,password123,SYIT,CSE,1,CSE21B001"}
              className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </details>

          {bulkResult && (
            <div className={`text-sm rounded-lg px-3 py-2 border ${bulkResult.error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
              {bulkResult.error ? (
                <p>{bulkResult.error}</p>
              ) : (
                <>
                  <p>Created: {bulkResult.created} · Skipped: {bulkResult.skipped}</p>
                  {bulkResult.errors?.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-y-auto text-xs list-disc pl-4">
                      {bulkResult.errors.slice(0, 20).map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setBulkOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Close</button>
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={bulkSaving || (!bulkPreview.length && !bulkText.trim())}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg"
            >
              {bulkSaving ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={progressOpen} onClose={() => setProgressOpen(false)} title="Student Learning Progress" size="lg">
        {progressLoading ? (
          <p className="text-center text-slate-500 py-8">Loading...</p>
        ) : progressData?.error ? (
          <p className="text-red-600 text-sm">{progressData.error}</p>
        ) : progressData ? (
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-slate-900">{progressData.student?.name}</p>
              <p className="text-sm text-slate-500">{progressData.student?.email}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-lg font-bold">{progressData.summary?.totalCourses ?? 0}</p>
                <p className="text-xs text-slate-500">Enrolled</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-lg font-bold text-amber-700">{progressData.summary?.ongoing ?? 0}</p>
                <p className="text-xs text-slate-500">Ongoing</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-lg font-bold text-emerald-700">{progressData.summary?.completed ?? 0}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-lg font-bold text-indigo-700">{progressData.summary?.avgPercentage ?? 0}%</p>
                <p className="text-xs text-slate-500">Avg score</p>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3">
              {(progressData.path || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No course enrollments</p>
              ) : (
                progressData.path.map((p: any) => (
                  <div key={p.enrollmentId} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 text-sm">{p.course?.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        p.status === "ongoing" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}>{p.status}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{p.progress}% · {p.tests?.filter((t: any) => t.passed).length || 0}/{p.tests?.length || 0} tests passed</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => setProgressOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Close</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardShell>
  );
}
