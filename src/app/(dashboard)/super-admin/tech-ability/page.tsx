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
  collegeId?: string | null;
  _count?: { testProblems: number };
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
  collegeId?: string;
  departmentId?: string | null;
  description?: string | null;
  college?: { id?: string; name: string };
  department?: { id?: string; name: string } | null;
  _count: { attempts: number; problems: number };
};

const LANGS = ["PYTHON", "JAVA", "JAVASCRIPT", "CPP", "C"];

export default function SuperAdminTechAbilityPage() {
  const [tab, setTab] = useState<"tests" | "problems">("tests");
  const [tests, setTests] = useState<TechTest[]>([]);
  const [problems, setProblems] = useState<TechProblem[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Test modal
  const [testModal, setTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<TechTest | null>(null);
  const [testForm, setTestForm] = useState({
    title: "",
    description: "",
    collegeId: "",
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

  // Problem modal
  const [probModal, setProbModal] = useState(false);
  const [editingProb, setEditingProb] = useState<TechProblem | null>(null);
  const [probForm, setProbForm] = useState({
    title: "",
    description: "",
    language: "PYTHON",
    starterCode: "",
    marks: "10",
    difficulty: "1",
    collegeId: "",
    testCasesText: '[{"input":"","expectedOutput":"","isHidden":false}]',
  });
  const [probSaving, setProbSaving] = useState(false);
  const [probError, setProbError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [tRes, pRes, cRes, dRes] = await Promise.all([
        fetch("/api/tech-ability/tests"),
        fetch("/api/tech-ability/problems"),
        fetch("/api/colleges"),
        fetch("/api/departments"),
      ]);
      setTests(Array.isArray(await tRes.json()) ? await tRes.clone().json().then((x) => (Array.isArray(x) ? x : [])) : []);
      const tData = await tRes.json().catch(() => []);
      // re-fetch cleanly
      const [testsData, problemsData, collegesData, deptsData] = await Promise.all([
        fetch("/api/tech-ability/tests").then((r) => r.json()),
        fetch("/api/tech-ability/problems").then((r) => r.json()),
        fetch("/api/colleges").then((r) => r.json()),
        fetch("/api/departments").then((r) => r.json()),
      ]);
      setTests(Array.isArray(testsData) ? testsData : []);
      setProblems(Array.isArray(problemsData) ? problemsData : []);
      setColleges(Array.isArray(collegesData) ? collegesData : []);
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
      collegeId: colleges[0]?.id || "",
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
      collegeId: t.collegeId || t.college?.id || "",
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
        payload.collegeId = testForm.collegeId;
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
      collegeId: "",
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
      collegeId: p.collegeId || "",
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
        collegeId: probForm.collegeId || null,
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

  const deptsForCollege = departments.filter(
    (d) => !testForm.collegeId || d.collegeId === testForm.collegeId
  );

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">TechAbility</h1>
            <p className="text-slate-500 mt-1">Coding tests — separate from MCQ assessments</p>
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
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Tech Tests
          </button>
          <button
            onClick={() => setTab("problems")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === "problems"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
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
              placeholder={tab === "tests" ? "Search tests..." : "Search problems..."}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Test</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Duration</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Problems</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Attempts</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Live</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Schedule</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredTests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No tech tests yet. Create problems first, then a test.
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
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  {t.isProctored && <Shield className="h-3 w-3 text-amber-500" />}
                                  {t.department?.name || t.college?.name || ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{t.durationMinutes} min</td>
                          <td className="px-6 py-4 text-slate-600">{t._count.problems}</td>
                          <td className="px-6 py-4 text-slate-600">{t._count.attempts}</td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => toggleTestLive(t.id, t.status)}
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
                            <p
                              className={`text-[10px] mt-1 font-medium ${
                                liveInfo.live ? "text-emerald-600" : "text-slate-400"
                              }`}
                            >
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
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditTest(t)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteTest(t.id, t.title)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            >
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
          </div>
        )}

        {tab === "problems" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-slate-100">
              <ListPaginationBar {...probPag} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Problem</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Language</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Marks</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Difficulty</th>
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
                  ) : filteredProbs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No problems yet. Create one to attach to tech tests.
                      </td>
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
                        <td className="px-6 py-4 text-slate-600">{p.difficulty}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditProb(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProb(p.id, p.title)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
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
        )}
      </div>

      {/* Create / Edit Tech Test */}
      <Modal
        open={testModal}
        onClose={() => setTestModal(false)}
        title={editingTest ? "Edit Tech Test" : "Create Tech Test"}
      >
        <form onSubmit={saveTest} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {testError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {testError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              required
              value={testForm.title}
              onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={testForm.description}
              onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          {!editingTest && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">College</label>
              <select
                required
                value={testForm.collegeId}
                onChange={(e) =>
                  setTestForm({ ...testForm, collegeId: e.target.value, departmentId: "" })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select college</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department (optional — blank = all depts)
            </label>
            <select
              value={testForm.departmentId}
              onChange={(e) => setTestForm({ ...testForm, departmentId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All departments</option>
              {deptsForCollege.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={testForm.durationMinutes}
                onChange={(e) => setTestForm({ ...testForm, durationMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total marks</label>
              <input
                type="number"
                value={testForm.totalMarks}
                onChange={(e) => setTestForm({ ...testForm, totalMarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing</label>
              <input
                type="number"
                value={testForm.passingMarks}
                onChange={(e) => setTestForm({ ...testForm, passingMarks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start (IST)</label>
              <input
                type="datetime-local"
                value={testForm.startTime}
                onChange={(e) => setTestForm({ ...testForm, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End (IST)</label>
              <input
                type="datetime-local"
                value={testForm.endTime}
                onChange={(e) => setTestForm({ ...testForm, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={testForm.isProctored}
                onChange={(e) => setTestForm({ ...testForm, isProctored: e.target.checked })}
              />
              Proctored
            </label>
            <select
              value={testForm.status}
              onChange={(e) => setTestForm({ ...testForm, status: e.target.value })}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Coding problems {editingTest ? "(leave empty to keep existing)" : "(required)"}
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {problems.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No problems — create some in the Problems tab first.</p>
              ) : (
                problems.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-slate-50 rounded">
                    <input
                      type="checkbox"
                      checked={testForm.problemIds.includes(p.id)}
                      onChange={(e) => {
                        setTestForm((f) => ({
                          ...f,
                          problemIds: e.target.checked
                            ? [...f.problemIds, p.id]
                            : f.problemIds.filter((x) => x !== p.id),
                        }));
                      }}
                    />
                    <span>
                      {p.title} <span className="text-xs text-slate-400">({p.language} · {p.marks}m)</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTestModal(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testSaving}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              {testSaving ? "Saving..." : editingTest ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Problem */}
      <Modal
        open={probModal}
        onClose={() => setProbModal(false)}
        title={editingProb ? "Edit Problem" : "Create Problem"}
      >
        <form onSubmit={saveProb} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {probError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {probError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              required
              value={probForm.title}
              onChange={(e) => setProbForm({ ...probForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description / statement</label>
            <textarea
              required
              value={probForm.description}
              onChange={(e) => setProbForm({ ...probForm, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
              <select
                value={probForm.language}
                onChange={(e) => setProbForm({ ...probForm, language: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
              <input
                type="number"
                value={probForm.marks}
                onChange={(e) => setProbForm({ ...probForm, marks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
              <input
                type="number"
                min={1}
                max={5}
                value={probForm.difficulty}
                onChange={(e) => setProbForm({ ...probForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Starter code</label>
            <textarea
              value={probForm.starterCode}
              onChange={(e) => setProbForm({ ...probForm, starterCode: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Test cases (JSON array)
            </label>
            <textarea
              value={probForm.testCasesText}
              onChange={(e) => setProbForm({ ...probForm, testCasesText: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono bg-slate-50"
              placeholder='[{{"input":"1\\n","expectedOutput":"2\\n","isHidden":false}}]'
            />
            <p className="text-xs text-slate-400 mt-1">
              Each case: input, expectedOutput, isHidden (optional). Hidden cases scored but not shown live.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProbModal(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={probSaving}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              {probSaving ? "Saving..." : editingProb ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
