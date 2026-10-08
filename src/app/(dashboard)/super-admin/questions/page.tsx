"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { useListPagination, ListPaginationBar } from "@/components/ui/ListPagination";
import { FileQuestion, Plus, Pencil, Trash2, Search, Upload, Download, FileSpreadsheet } from "lucide-react";
import { parseSpreadsheetFile, parseCsvText } from "@/lib/parse-spreadsheet";
import { WordBulkUpload } from "@/components/questions/WordBulkUpload";

type College = { id: string; name: string };
type Department = { id: string; name: string; college?: College };
type Question = {
  id: string;
  text: string;
  type: string;
  options: string | null;
  correctAnswer: string;
  difficulty: number;
  marks: number;
  imageUrl?: string | null;
  college: College | null;
  department: Department | null;
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState({
    text: "",
    type: "MCQ",
    options: "",
    correctAnswer: "",
    difficulty: "1",
    marks: "1",
    collegeId: "",
    departmentId: "",
    imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bankName, setBankName] = useState("");
  const [existingBankId, setExistingBankId] = useState("");
  const [banks, setBanks] = useState<any[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const qFileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (collegeFilter) params.set("collegeId", collegeFilter);
      const [qRes, cRes, dRes, bRes] = await Promise.all([
        fetch(`/api/questions?${params}`),
        fetch("/api/colleges"),
        fetch("/api/departments"),
        fetch("/api/question-banks"),
      ]);
      const _qRes = await qRes.json();
      setQuestions(Array.isArray(_qRes) ? _qRes : []);
      const _cRes = await cRes.json();
      setColleges(Array.isArray(_cRes) ? _cRes : []);
      const _dRes = await dRes.json();
      setDepartments(Array.isArray(_dRes) ? _dRes : []);
      const _bRes = await bRes.json();
      setBanks(Array.isArray(_bRes) ? _bRes : []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [collegeFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      text: "",
      type: "MCQ",
      options: "Option A\nOption B\nOption C\nOption D",
      correctAnswer: "",
      difficulty: "1",
      marks: "1",
      collegeId: colleges[0]?.id || "",
      departmentId: "",
      imageUrl: "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    let opts = q.options || "";
    try {
      const parsed = JSON.parse(opts);
      if (Array.isArray(parsed)) opts = parsed.join("\n");
    } catch {}
    setForm({
      text: q.text,
      type: q.type,
      options: opts,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty.toString(),
      marks: q.marks.toString(),
      collegeId: q.college?.id || "",
      departmentId: q.department?.id || "",
      imageUrl: q.imageUrl || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const optionsArr = form.options.split("\n").map((o) => o.trim()).filter(Boolean);
      const payload = {
        ...form,
        options: form.type === "MCQ" || form.type === "TRUE_FALSE" ? optionsArr : null,
        imageUrl: form.imageUrl || null,
      };
      const url = editing ? `/api/questions/${editing.id}` : "/api/questions";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
      setModalOpen(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function onQFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      let questionsList: any[] = bulkPreview;
      if (!questionsList.length && bulkText.trim()) {
        const trimmed = bulkText.trim();
        questionsList = trimmed.startsWith("[") ? JSON.parse(trimmed) : parseCsvText(trimmed);
      }
      if (!questionsList.length) { setBulkResult({ error: "Upload a CSV/Excel file (or paste data)." }); setBulkSaving(false); return; }
      if (!existingBankId && !bankName.trim()) { setBulkResult({ error: "Select an existing bank or enter a new bank name" }); setBulkSaving(false); return; }
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionBankId: existingBankId || undefined,
          bankName: existingBankId ? undefined : bankName.trim(),
          collegeId: collegeFilter || undefined,
          questions: questionsList,
        }),
      });
      const data = await res.json();
      setBulkResult(data);
      if (res.ok && data.created > 0) load();
    } catch (e: any) {
      setBulkResult({ error: e.message || "Upload failed" });
    } finally {
      setBulkSaving(false);
    }
  }

  function downloadQTemplate() {
    const csv = "text,type,options,correctAnswer,difficulty,marks\n" + '"What is 2+2?",MCQ,"2|3|4|5",4,1,1\n' + '"Earth is flat?",TRUE_FALSE,"True|False",False,1,1\n';
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openQBulk() {
    setBulkOpen(true);
    setBulkText("");
    setBankName("");
    setExistingBankId("");
    setBulkFile(null);
    setBulkPreview([]);
    setBulkResult(null);
    if (qFileRef.current) qFileRef.current.value = "";
  }

  const filtered = questions.filter((q) => !search || q.text.toLowerCase().includes(search.toLowerCase()));
  const { page, setPage, viewAll, setViewAll, pageItems, total, totalPages, from, to } = useListPagination(filtered, 20);

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
            <p className="text-slate-500 mt-1">Create and manage questions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadQTemplate} className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50">
              <Download className="h-4 w-4" /> CSV Template
            </button>
            <button onClick={openQBulk} className="inline-flex items-center gap-2 border border-indigo-300 text-indigo-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-50">
              <Upload className="h-4 w-4" /> Bulk Upload
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
              <Plus className="h-4 w-4" /> Add Question
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="search" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Colleges</option>
            {colleges.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 pt-3 pb-1 border-b border-slate-100">
            <ListPaginationBar page={page} setPage={setPage} viewAll={viewAll} setViewAll={setViewAll} total={total} totalPages={totalPages} from={from} to={to} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Question</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Marks</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Difficulty</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">College</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No questions found.</td></tr>
                ) : (
                  pageItems.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-start gap-3">
                          {q.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q.imageUrl} alt="" className="h-12 w-12 rounded border border-slate-200 object-contain shrink-0" />
                          ) : null}
                          <p className="font-medium text-slate-900 line-clamp-2">{q.text}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{q.type}</span></td>
                      <td className="px-6 py-4 text-slate-600">{q.marks}</td>
                      <td className="px-6 py-4 text-slate-600">{q.difficulty}/5</td>
                      <td className="px-6 py-4 text-slate-600">{q.college?.name || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Question" : "Add Question"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question Text *</label>
            <textarea required rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1500000) { setError("Image must be under 1.5 MB"); return; }
              const reader = new FileReader();
              reader.onload = () => setForm((f) => ({ ...f, imageUrl: String(reader.result || "") }));
              reader.readAsDataURL(file);
            }} className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium" />
            {form.imageUrl ? (
              <div className="mt-2 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="" className="max-h-28 rounded border border-slate-200 object-contain" />
                <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="text-xs text-red-600 hover:underline">Remove image</button>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">True/False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
              <input type="number" min="1" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty (1-5)</label>
              <input type="number" min="1" max="5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {(form.type === "MCQ" || form.type === "TRUE_FALSE") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Options (one per line)</label>
              <textarea rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder={"Option A\nOption B\nOption C\nOption D"} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer *</label>
            <input required value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Exact text of correct option" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
              <select value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select</option>
                {colleges.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select</option>
                {departments.filter((d) => !form.collegeId || (d as any).college?.id === form.collegeId).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
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

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Upload Questions" size="lg">
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">Word document (.docx) — image questions</p>
            <WordBulkUpload banks={banks} collegeId={collegeFilter || undefined} onDone={() => { setBulkOpen(false); load(); }} />
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">CSV / Excel bulk (text only)</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Existing bank</label>
                <select value={existingBankId} onChange={(e) => setExistingBankId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="">— New bank —</option>
                  {banks.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Or new bank name</label>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={!!existingBankId} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. Reasoning Set 1" />
              </div>
            </div>
            <input ref={qFileRef} type="file" accept=".csv,.xlsx,.xls,.tsv" onChange={onQFileChange} className="block w-full text-sm mb-2" />
            {bulkPreview.length > 0 && <p className="text-xs text-emerald-700 mb-2">{bulkPreview.length} row(s) ready</p>}
            <textarea rows={4} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Or paste CSV/JSON" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono mb-2" />
            {bulkResult && (
              <div className={`text-sm rounded-lg px-3 py-2 border mb-2 ${bulkResult.error ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
                {bulkResult.error ? bulkResult.error : `Created: ${bulkResult.created} · Skipped: ${bulkResult.skipped}`}
              </div>
            )}
            <button type="button" onClick={handleBulkUpload} disabled={bulkSaving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium py-2.5 rounded-lg">
              {bulkSaving ? "Uploading..." : "Upload CSV/Excel"}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
