"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { useListPagination, ListPaginationBar } from "@/components/ui/ListPagination";
import { Code2, Plus, Pencil, Trash2, Search, Shield, Play } from "lucide-react";
import { istLocalInputToUtc, utcToIstLocalInput, formatIst, checkTestLive } from "@/lib/test-live";

type TechProblem = {
  id: string;
  title: string;
  language: string;
  marks: number;
  difficulty: number;
  description?: string;
  starterCode?: string | null;
  testCases?: string;
};

type TechTest = {
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
  departmentId?: string | null;
  description?: string | null;
  department?: { id?: string; name: string } | null;
  _count: { attempts: number; problems: number };
};

const LANGS = ["PYTHON", "JAVA", "JAVASCRIPT", "CPP", "C"];

export default function CollegeAdminTechAbilityPage() {
  const [tab, setTab] = useState<"tests" | "problems">("tests");
  const [tests, setTests] = useState<TechTest[]>([]);
  const [problems, setProblems] = useState<TechProblem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [testModal, setTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<TechTest | null>(null);
  const [testForm, setTestForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    durationMinutes: "60",
    totalMarks: "100",
    passingMarks: "40",
    isProctored: true,
    status: "PUBLISHED",
    maxAttempts: "1",
    problemIds: [] as string[],
    startTime: "",
    endTime: "",
  });
  const [testSaving, setTestSaving] = useState(false);
  const [testError, setTestError] = useState("");

  const [probModal, setProbModal] = useState(false);
  const [editingProb, setEditingProb] = useState<TechProblem | null>(null);
  const [probForm, setProbForm] = useState({
    title: "",
    description: "",
    language: "PYTHON",
    starterCode: "",
    marks: "10",
    difficulty: "1",
    testCasesText: '[{"input":"","expectedOutput":"","isHidden":false}]',
  });
  const [probSaving, setProbSaving] = useState(false);
  const [probError, setProbError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [testsData, problemsData, deptsData] = await Promise.all([
        fetch("/api/tech-ability/tests").then((r) => r.json()),
        fetch("/api/tech-ability/problems").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
      ]);
      setTests(Array.isArray(testsData) ? testsData : []);
      setProblems(Array.isArray(problemsData) ? problemsData : []);
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch {
      setTests([]);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreateTest() {
    setEditingTest(null);
    setTestForm({
      title: "",
      description: "",
      departmentId: "",
      durationMinutes: "60",
      totalMarks: "100",
      passingMarks: "40",
      isProctored: true,
      status: "PUBLISHED",
      maxAttempts: "1",
      problemIds: [],
      startTime: "",
      endTime: "",
    });
    setTestError("");
    setTestModal(true);
  }

  function openEditTest(t: TechTest) {
    setEditingTest(t);
    setTestForm({
      title: t.title,
      description: t.description || "",
      departmentId: t.departmentId || (t.department as any)?.id || "",
      durationMinutes: String(t.durationMinutes || 60),
      totalMarks: String(t.totalMarks || 100),
      passingMarks: String(t.passingMarks || 40),
      isProctored: t.isProctored,
      status: t.status || "PUBLISHED",
      maxAttempts: String(t.maxAttempts ?? 1),
      problemIds: [],
      startTime: utcToIstLocalInput(t.startTime),
      endTime: utcToIstLocalInput(t.endTime),
    });
    setTestError("");
    setTestModal(true);
  }

  async function saveTest(e: React.FormEvent) {
    e.preventDefault();
    setTestSaving(true);
    setTestError("");
    if (!editingTest && !testForm.problemIds.length) {
      setTestError("Select at least one coding problem");
      setTestSaving(false);
      return;
    }
    try {
      const start = istLocalInputToUtc(testForm.startTime);
      const end = istLocalInputToUtc(testForm.endTime);
      const payload: any = {
        title: testForm.title,
        description: testForm.description,
        departmentId: testForm.departmentId || null,
        durationMinutes: testForm.durationMinutes,
        totalMarks: testForm.totalMarks,
        passingMarks: testForm.passingMarks,
        isProctored: testForm.isProctored,
        status: testForm.status,
        maxAttempts: testForm.maxAttempts,
        startTime: start ? start.toISOString() : null,
        endTime: end ? end.toISOString() : null,
      };
      if (!editingTest) {
        payload.problemIds = testForm.problemIds;
      } else if (testForm.problemIds.length) {
        payload.problemIds = testForm.problemIds;
      }

      const res = await fetch(
        editingTest ? `/api/tech-ability/tests/${editingTest.id}` : "/api/tech-ability/tests",
        {
          method: editingTest ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || "Failed");
        setTestSaving(false);
        return;
      }
      setTestModal(false);
      load();
    } catch {
      setTestError("Network error");
    } finally {
      setTestSaving(false);
    }
  }

  async function toggleTestLive(id: string, current: string) {
    const newStatus = current === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/tech-ability/tests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  async function deleteTest(id: string, title: string) {
    if (!confirm(`Archive tech test "${title}"?`)) return;
    await fetch(`/api/tech-ability/tests/${id}`, { method: "DELETE" });
    load();
  }

  function openCreateProb() {
    setEditingProb(null);
    setProbForm({
      title: "",
      description: "",
      language: "PYTHON",
      starterCode: "# Write your solution\n",
      marks: "10",
      difficulty: "1",
      testCasesText: '[{"input":"1\n","expectedOutput":"2\n","isHidden":false}]',
    });
    setProbError("");
    setProbModal(true);
  }

  function openEditProb(p: TechProblem) {
    setEditingProb(p);
    setProbForm({
      title: p.title,
      description: p.description || "",
      language: p.language || "PYTHON",
      starterCode: p.starterCode || "",
      marks: String(p.marks || 10),
      difficulty: String(p.difficulty || 1),
      testCasesText: p.testCases || "[]",
    });
    setProbError("");
    setProbModal(true);
  }

  async function saveProb(e: React.FormEvent) {
    e.preventDefault();
    setProbSaving(true);
    setProbError("");
    try {
      let cases;
      try {
        cases = JSON.parse(probForm.testCasesText);
        if (!Array.isArray(cases)) throw new Error("Must be array");
      } catch {
        setProbError("Test cases must be valid JSON array");
        setProbSaving(false);
        return;
      }
      const payload = {
        title: probForm.title,
        description: probForm.description,
        language: probForm.language,
        starterCode: probForm.starterCode,
        marks: probForm.marks,
        difficulty: probForm.difficulty,
        testCases: cases,
      };
      const res = await fetch(
        editingProb ? `/api/tech-ability/problems/${editingProb.id}` : "/api/tech-ability/problems",
        {
          method: editingProb ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setProbError(data.error || "Failed");
        setProbSaving(false);
        return;
      }
      setProbModal(false);
      load();
    } catch {
      setProbError("Network error");
    } finally {
      setProbSaving(false);
    }
  }

  async function deleteProb(id: string, title: string) {
    if (!confirm(`Deactivate problem "${title}"?`)) return;
    await fetch(`/api/tech-ability/problems/${id}`, { method: "DELETE" });
    load();
  }

  const filteredTests = tests.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProbs = problems.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase())
  );
  const testPag = useListPagination(filteredTests, 20);
  const probPag = useListPagination(filteredProbs, 20);

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">TechAbility</h1>
            <p className="text-slate-500 mt-1">Coding tests for your college</p>
          </div>
          <div className="flex gap-2">
            {tab === "tests" ? (
              <button
                onClick={openCreateTest}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
              >
                <Plus className="h-4 w-4" /> Create Tech Test
              </button>
            ) : (
              <button
                onClick={openCreateProb}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
              >
                <Plus className="h-4 w-4" /> Create Problem
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setTab("tests")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "tests"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500"
            }`}
          >
            Tech Tests
          </button>
          <button
            onClick={() => setTab("problems")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "problems"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500"
            }`}
          >
            Problems
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {tab === "tests" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-slate-100">
              <ListPaginationBar {...testPag} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Test</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Problems</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Live</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No tech tests yet.
                    </td>
                  </tr>
                ) : (
                  testPag.pageItems.map((t) => {
                    const liveInfo = checkTestLive(t);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                              <Code2 className="h-4 w-4 text-violet-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{t.title}</p>
                              <p className="text-xs text-slate-500">
                                {t.isProctored && <Shield className="inline h-3 w-3 text-amber-500 mr-1" />}
                                {t.department?.name || "All departments"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{t.durationMinutes} min</td>
                        <td className="px-6 py-4 text-slate-600">{t._count.problems}</td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => toggleTestLive(t.id, t.status)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              t.status === "PUBLISHED" ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                                t.status === "PUBLISHED" ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <p className={`text-[10px] mt-1 ${liveInfo.live ? "text-emerald-600" : "text-slate-400"}`}>
                            {liveInfo.live ? "Live" : t.status === "PUBLISHED" ? "Scheduled" : "Off"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openEditTest(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteTest(t.id, t.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "problems" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-slate-100">
              <ListPaginationBar {...probPag} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Problem</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Language</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Marks</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : filteredProbs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No problems yet.</td>
                  </tr>
                ) : (
                  probPag.pageItems.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Play className="h-4 w-4 text-violet-600" />
                          </div>
                          <p className="font-medium text-slate-900">{p.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{p.language}</td>
                      <td className="px-6 py-4 text-slate-600">{p.marks}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => openEditProb(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteProb(p.id, p.title)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={testModal} onClose={() => setTestModal(false)} title={editingTest ? "Edit Tech Test" : "Create Tech Test"}>
        <form onSubmit={saveTest} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {testError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{testError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department (optional)</label>
            <select value={testForm.departmentId} onChange={(e) => setTestForm({ ...testForm, departmentId: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
              <input type="number" value={testForm.durationMinutes} onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total marks</label>
              <input type="number" value={testForm.totalMarks} onChange={(e) => setTestForm({ ...testForm, totalMarks: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing</label>
              <input type="number" value={testForm.passingMarks} onChange={(e) => setTestForm({ ...testForm, passingMarks: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={testForm.isProctored} onChange={(e) => setTestForm({ ...testForm, isProctored: e.target.checked })} />
              Proctored
            </label>
            <select value={testForm.status} onChange={(e) => setTestForm({ ...testForm, status: e.target.value })} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Problems {editingTest ? "(optional replace)" : ""}</label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {problems.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={testForm.problemIds.includes(p.id)}
                    onChange={(e) =>
                      setTestForm((f) => ({
                        ...f,
                        problemIds: e.target.checked ? [...f.problemIds, p.id] : f.problemIds.filter((x) => x !== p.id),
                      }))
                    }
                  />
                  {p.title} <span className="text-xs text-slate-400">({p.language})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setTestModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={testSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">{testSaving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={probModal} onClose={() => setProbModal(false)} title={editingProb ? "Edit Problem" : "Create Problem"}>
        <form onSubmit={saveProb} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {probError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{probError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required value={probForm.title} onChange={(e) => setProbForm({ ...probForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea required value={probForm.description} onChange={(e) => setProbForm({ ...probForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
              <select value={probForm.language} onChange={(e) => setProbForm({ ...probForm, language: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
              <input type="number" value={probForm.marks} onChange={(e) => setProbForm({ ...probForm, marks: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <input type="number" min={1} max={5} value={probForm.difficulty} onChange={(e) => setProbForm({ ...probForm, difficulty: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starter code</label>
            <textarea value={probForm.starterCode} onChange={(e) => setProbForm({ ...probForm, starterCode: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test cases (JSON)</label>
            <textarea value={probForm.testCasesText} onChange={(e) => setProbForm({ ...probForm, testCasesText: e.target.value })} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProbModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={probSaving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">{probSaving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
