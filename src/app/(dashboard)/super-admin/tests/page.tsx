"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { ClipboardList, Plus, Pencil, Trash2, Search, Shield, CalendarClock } from "lucide-react";
import Link from "next/link";
import { istLocalInputToUtc, utcToIstLocalInput, formatIst, checkTestLive } from "@/lib/test-live";

type Test = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isProctored: boolean;
  maxAttempts: number;
  startTime?: string | null;
  endTime?: string | null;
  college?: { name: string };
  department?: { name: string } | null;
  _count: { attempts: number; questions: number };
};

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [bankFilter, setBankFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    collegeId: "",
    departmentId: "",
    courseId: "",
    durationMinutes: "60",
    totalMarks: "100",
    passingMarks: "40",
    isProctored: true,
    status: "DRAFT",
    maxAttempts: "1",
    questionBankId: "",
    questionIds: [] as string[],
    startTime: "",
    endTime: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTest, setScheduleTest] = useState<Test | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ startTime: "", endTime: "" });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [tRes, cRes, dRes, qRes, bRes, coRes] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/colleges"),
        fetch("/api/departments"),
        fetch("/api/questions"),
        fetch("/api/question-banks"),
        fetch("/api/courses"),
      ]);
      const _tRes = await tRes.json();
      setTests(Array.isArray(_tRes) ? _tRes : []);
      const _cRes = await cRes.json();
      setColleges(Array.isArray(_cRes) ? _cRes : []);
      const _dRes = await dRes.json();
      setDepartments(Array.isArray(_dRes) ? _dRes : []);
      const _qRes = await qRes.json();
      setQuestions(Array.isArray(_qRes) ? _qRes : []);
      const _bRes = await bRes.json();
      setBanks(Array.isArray(_bRes) ? _bRes : []);
      const _coRes = await coRes.json();
      setCourses(Array.isArray(_coRes) ? _coRes : []);
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
    setEditing(null);
    setForm({
      title: "",
      description: "",
      collegeId: colleges[0]?.id || "",
      departmentId: "",
      courseId: "",
      durationMinutes: "60",
      totalMarks: "100",
      passingMarks: "40",
      isProctored: true,
      status: "PUBLISHED",
      maxAttempts: "2",
      questionBankId: "",
      questionIds: [],
      startTime: "",
      endTime: "",
    });
    setBankFilter("");
    setError("");
    setModalOpen(true);
  }


  function openEdit(t: Test) {
    setEditing(t);
    setForm({
      title: t.title,
      description: (t as any).description || "",
      collegeId: (t as any).collegeId || (t as any).college?.id || "",
      departmentId: (t as any).departmentId || t.department?.id || "",
      courseId: (t as any).courseId || "",
      durationMinutes: String(t.durationMinutes || 60),
      totalMarks: String(t.totalMarks || 100),
      passingMarks: String(t.passingMarks || 40),
      isProctored: t.isProctored,
      status: t.status || "PUBLISHED",
      maxAttempts: String(t.maxAttempts ?? 1),
      questionBankId: "",
      questionIds: [],
      startTime: utcToIstLocalInput(t.startTime),
      endTime: utcToIstLocalInput(t.endTime),
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    // Creating requires a question bank; editing can skip (keep existing questions)
    if (!editing && !form.questionBankId && !form.questionIds.length) {
      setError("Select a Question Bank (all its questions will be used)");
      setSaving(false);
      return;
    }
    try {
      const start = istLocalInputToUtc(form.startTime);
      const end = istLocalInputToUtc(form.endTime);
      const payload: any = {
        title: form.title,
        description: form.description,
        departmentId: form.departmentId || null,
        courseId: form.courseId || null,
        durationMinutes: form.durationMinutes,
        totalMarks: form.totalMarks,
        passingMarks: form.passingMarks,
        isProctored: form.isProctored,
        status: form.status,
        maxAttempts: form.maxAttempts,
        startTime: start ? start.toISOString() : null,
        endTime: end ? end.toISOString() : null,
      };
      if (!editing) {
        payload.collegeId = form.collegeId;
        if (form.questionBankId) {
          payload.questionBankId = form.questionBankId;
        } else {
          payload.questionIds = form.questionIds;
        }
      } else if (form.questionBankId) {
        // Optional: replace questions when editing if a bank is selected
        payload.questionBankId = form.questionBankId;
      }

      const res = await fetch(editing ? `/api/tests/${editing.id}` : "/api/tests", {
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
      setModalOpen(false);
      setEditing(null);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function selectAllVisible() {
    const visible = questions
      .filter((q) => !bankFilter || q.questionBank?.id === bankFilter)
      .map((q) => q.id);
    setForm((f) => ({
      ...f,
      questionIds: Array.from(new Set([...f.questionIds, ...visible])),
    }));
  }

  function clearQuestions() {
    setForm((f) => ({ ...f, questionIds: [] }));
  }

  async function attachQuestionsToTest(testId: string, currentCount: number) {
    if (currentCount > 0) {
      if (!confirm("This test already has questions. Replace them with selected bank questions?")) return;
    }
    const visible = questions
      .filter((q) => !bankFilter || q.questionBank?.id === bankFilter)
      .map((q) => q.id);
    if (!visible.length) {
      // Load questions if empty
      const qRes = await fetch("/api/questions").then((r) => r.json());
      const allQ = Array.isArray(qRes) ? qRes : [];
      if (!allQ.length) {
        alert("No questions in the system. Create a Question Bank and bulk-upload first.");
        return;
      }
      setQuestions(allQ);
      const ids = allQ.map((q: any) => q.id);
      const n = Math.min(20, ids.length);
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: ids.slice(0, n) }),
      });
      if (res.ok) {
        alert(`Attached ${n} question(s).`);
        load();
      } else {
        const d = await res.json();
        alert(d.error || "Failed");
      }
      return;
    }
    const n = Math.min(20, visible.length);
    const res = await fetch(`/api/tests/${testId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: visible.slice(0, n) }),
    });
    if (res.ok) {
      alert(`Attached ${n} question(s) to the test.`);
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Failed to attach questions");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Permanently delete test "${title}"? This removes attempts and cannot be undone.`)) return;
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
    if (!confirm(`Permanently delete ${selectedIds.length} test(s)?`)) return;
    const res = await fetch("/api/tests/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "Bulk delete failed");
      return;
    }
    setSelectedIds([]);
    load();
  }

  async function toggleLive(id: string, current: string) {
    const newStatus = current === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/tests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  function openSchedule(t: Test) {
    setScheduleTest(t);
    setScheduleForm({
      startTime: utcToIstLocalInput(t.startTime),
      endTime: utcToIstLocalInput(t.endTime),
    });
    setScheduleOpen(true);
  }

  async function saveSchedule() {
    if (!scheduleTest) return;
    setScheduleSaving(true);
    try {
      const start = istLocalInputToUtc(scheduleForm.startTime);
      const end = istLocalInputToUtc(scheduleForm.endTime);
      await fetch(`/api/tests/${scheduleTest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start ? start.toISOString() : null,
          endTime: end ? end.toISOString() : null,
        }),
      });
      setScheduleOpen(false);
      load();
    } finally {
      setScheduleSaving(false);
    }
  }

  const filtered = tests.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tests / Assessments</h1>
            <p className="text-slate-500 mt-1">Create and manage proctored tests</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={() => toggleSelectAll(filtered.map((x: any) => x.id))}
                      className="rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Test</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Marks</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Questions</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Live</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Schedule (IST)</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No tests found.</td></tr>
                ) : (
                  filtered.map((t) => {
                    const liveInfo = checkTestLive(t);
                    return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded border-slate-300"
                        />
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
                              {t.department?.name || t.college?.name || ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{t.durationMinutes} min</td>
                      <td className="px-6 py-4 text-slate-600">{t.totalMarks}</td>
                      <td className="px-6 py-4 text-slate-600">{t._count.questions}</td>
                      <td className="px-6 py-4 text-slate-600">{t._count.attempts}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={t.status === "PUBLISHED"}
                          onClick={() => toggleLive(t.id, t.status)}
                          title={t.status === "PUBLISHED" ? "Turn OFF (students blocked)" : "Turn ON (published)"}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            t.status === "PUBLISHED" ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              t.status === "PUBLISHED" ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <p className={`text-[10px] mt-1 font-medium ${liveInfo.live ? "text-emerald-600" : "text-slate-400"}`}>
                          {liveInfo.live ? "Live now" : t.status === "PUBLISHED" ? "Scheduled" : "Off"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {t.startTime || t.endTime ? (
                          <div className="space-y-0.5">
                            {t.startTime && <div>Opens: {formatIst(t.startTime)}</div>}
                            {t.endTime && <div>Closes: {formatIst(t.endTime)}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-400">Always (when On)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/super-admin/results/${t.id}`}
                            className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                            title="View results"
                          >
                            Results
                          </Link>
                          <button
                            onClick={() => openSchedule(t)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
                            title="Schedule (IST)"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </button>
                          {t._count.questions === 0 && (
                            <button
                              onClick={() => attachQuestionsToTest(t.id, t._count.questions)}
                              className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                              title="Attach questions from bank"
                            >
                              + Questions
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
                            title="Edit test (attempts, duration, schedule…)"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(t.id, t.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Test" : "Create Test"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">College *</label>
              <select required value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value, courseId: "" })}
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
                <option value="">All / Select</option>
                {departments
                  .filter((d) => !form.collegeId || d.college?.id === form.collegeId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link to Course (optional)</label>
            <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">No course</option>
              {courses
                .filter((c) => !form.collegeId || c.college?.id === form.collegeId || !c.college)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.title}{c.code ? ` (${c.code})` : ""}</option>
                ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Students will see this test under the course page after enrolling.</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
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
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isProctored} onChange={(e) => setForm({ ...form, isProctored: e.target.checked })} />
              Proctored (Fullscreen + tab detection)
            </label>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-100 rounded-lg p-3 bg-slate-50">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opens at (IST, optional)</label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Closes at (IST, optional)</label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <p className="sm:col-span-2 text-[11px] text-slate-500">Times are India Standard Time (UTC+5:30, Asia/Kolkata). Leave empty for always available when Live is On.</p>
            </div>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question Bank *</label>
            <select
              required
              value={form.questionBankId}
              onChange={(e) => setForm({ ...form, questionBankId: e.target.value, questionIds: [] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a Question Bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b._count?.questions ?? 0} question(s)
                  {b.college?.name ? ` · ${b.college.name}` : " · Global"}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              All questions in the selected bank are attached to this test automatically.
            </p>
            {form.questionBankId && (
              <p className="text-xs text-emerald-600 mt-1">
                {(banks.find((b) => b.id === form.questionBankId)?._count?.questions ?? 0)} question(s) will be included
              </p>
            )}
            {banks.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No banks yet. Go to Question Banks / Questions and bulk-upload first.
              </p>
            )}
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

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title={`Schedule – ${scheduleTest?.title || ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Set when students can take this test. Times use <strong>IST (Asia/Kolkata, UTC+5:30)</strong>.
            Leave blank for always available while the Live toggle is On.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opens at (IST)</label>
            <input
              type="datetime-local"
              value={scheduleForm.startTime}
              onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closes at (IST)</label>
            <input
              type="datetime-local"
              value={scheduleForm.endTime}
              onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setScheduleForm({ startTime: "", endTime: "" })}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Clear schedule
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setScheduleOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSchedule}
                disabled={scheduleSaving}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg disabled:opacity-50"
              >
                {scheduleSaving ? "Saving..." : "Save schedule"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
