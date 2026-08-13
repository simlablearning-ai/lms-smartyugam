"use client";
import { useEffect, useState, use } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, ArrowLeft, Video, FileText, FileType } from "lucide-react";
import Link from "next/link";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [modModal, setModModal] = useState(false);
  const [modTitle, setModTitle] = useState("");
  const [cModal, setCModal] = useState(false);
  const [cModId, setCModId] = useState("");
  const [cForm, setCForm] = useState({ title: "", type: "TEXT", body: "", url: "" });
  const [aModal, setAModal] = useState(false);
  const [aModId, setAModId] = useState("");
  const [aBank, setABank] = useState("");
  const [fBank, setFBank] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    const [c, m, b] = await Promise.all([
      fetch(`/api/courses/${courseId}`).then((r) => r.json()),
      fetch(`/api/modules?courseId=${courseId}`).then((r) => r.json()),
      fetch("/api/question-banks").then((r) => r.json()),
    ]);
    if (!c.error) setCourse(c);
    setModules(Array.isArray(m) ? m : []);
    setBanks(Array.isArray(b) ? b : []);
  }
  useEffect(() => { load(); }, [courseId]);

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, title: modTitle }) });
    if (!res.ok) { setErr((await res.json()).error); return; }
    setModModal(false); setModTitle(""); load();
  }
  async function addContent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/module-contents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: cModId, title: cForm.title, type: cForm.type, body: cForm.type === "TEXT" ? cForm.body : null, url: cForm.type !== "TEXT" ? cForm.url : null }),
    });
    if (!res.ok) { setErr((await res.json()).error); return; }
    setCModal(false); load();
  }
  async function linkAssess(kind: "module" | "final") {
    const bankId = kind === "module" ? aBank : fBank;
    if (!bankId) return setErr("Select bank");
    const testRes = await fetch("/api/tests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: kind === "final" ? `Final – ${course?.title}` : "Module Quiz",
        collegeId: course?.collegeId || course?.college?.id,
        courseId, questionBankId: bankId, purpose: kind === "final" ? "FINAL" : "MODULE",
        status: "PUBLISHED", isProctored: kind === "final", durationMinutes: 30, maxAttempts: 3,
      }),
    });
    const test = await testRes.json();
    if (!testRes.ok) return setErr(test.error || "Failed");
    if (kind === "module") await fetch(`/api/modules/${aModId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentTestId: test.id }) });
    else await fetch(`/api/courses/${courseId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalTestId: test.id }) });
    setAModal(false); load();
  }

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <Link href="/super-admin/courses" className="text-sm text-slate-500 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Courses</Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{course?.title || "Course"} – Content</h1>
          <button onClick={() => setModModal(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Module</button>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="font-medium mb-2">Final assessment</p>
          {course?.finalTestId ? <p className="text-sm text-emerald-700">Linked</p> : (
            <div className="flex gap-2">
              <select value={fBank} onChange={(e) => setFBank(e.target.value)} className="border rounded-lg text-sm px-2 py-1.5 flex-1">
                <option value="">Question Bank</option>
                {banks.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button onClick={() => linkAssess("final")} className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg">Create</button>
            </div>
          )}
        </div>
        {modules.map((m: any, i: number) => (
          <div key={m.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b flex justify-between gap-2">
              <div><p className="font-semibold">Module {i + 1}: {m.title}</p>
                <p className="text-xs text-slate-400">{m.contents?.length || 0} items{m.assessmentTest ? ` · ${m.assessmentTest.title}` : ""}</p></div>
              <div className="flex gap-1">
                <button onClick={() => { setCModId(m.id); setCForm({ title: "", type: "TEXT", body: "", url: "" }); setCModal(true); }} className="text-xs border px-2 py-1 rounded-lg">+ Content</button>
                {!m.assessmentTestId && <button onClick={() => { setAModId(m.id); setABank(""); setAModal(true); }} className="text-xs border border-violet-200 text-violet-700 px-2 py-1 rounded-lg">+ Quiz</button>}
                <button onClick={async () => { if (confirm("Delete?")) { await fetch(`/api/modules/${m.id}`, { method: "DELETE" }); load(); } }} className="p-1 text-slate-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <ul className="divide-y">
              {(m.contents || []).map((c: any) => (
                <li key={c.id} className="px-4 py-2 text-sm flex gap-2 items-center">
                  {c.type === "VIDEO" ? <Video className="h-4 w-4 text-rose-500" /> : c.type === "PDF" ? <FileType className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-sky-500" />}
                  <span>{c.title}</span><span className="text-xs text-slate-400">{c.type}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
      <Modal open={modModal} onClose={() => setModModal(false)} title="Add Module">
        <form onSubmit={addModule} className="space-y-3">
          <input required value={modTitle} onChange={(e) => setModTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Module title" />
          <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">Save</button>
        </form>
      </Modal>
      <Modal open={cModal} onClose={() => setCModal(false)} title="Add Content" size="lg">
        <form onSubmit={addContent} className="space-y-3">
          <input required value={cForm.title} onChange={(e) => setCForm({ ...cForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Title" />
          <select value={cForm.type} onChange={(e) => setCForm({ ...cForm, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="TEXT">Text</option><option value="VIDEO">Video URL</option><option value="PDF">PDF URL</option>
          </select>
          {cForm.type === "TEXT" ? (
            <textarea rows={6} value={cForm.body} onChange={(e) => setCForm({ ...cForm, body: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          ) : (
            <input value={cForm.url} onChange={(e) => setCForm({ ...cForm, url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://" />
          )}
          <button type="submit" className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">Save</button>
        </form>
      </Modal>
      <Modal open={aModal} onClose={() => setAModal(false)} title="Module Quiz from Bank">
        <div className="space-y-3">
          <select value={aBank} onChange={(e) => setABank(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Question Bank</option>
            {banks.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={() => linkAssess("module")} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">Create & link</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
