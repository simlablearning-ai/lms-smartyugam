"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BookOpen, ClipboardList, ArrowLeft, Play, CheckCircle2, Circle, Video, FileText, FileType, Lock } from "lucide-react";
import Link from "next/link";

export default function StudentCourseDetailPage() {
  const id = useParams().id as string;
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, m, p, e] = await Promise.all([
        fetch(`/api/courses/${id}`).then((r) => r.json()),
        fetch(`/api/modules?courseId=${id}`).then((r) => r.json()),
        fetch(`/api/module-progress?courseId=${id}`).then((r) => r.json()),
        fetch("/api/enrollments").then((r) => r.json()),
      ]);
      if (!c.error) setCourse(c);
      setModules(Array.isArray(m) ? m : c.modules || []);
      setProgress(Array.isArray(p) ? p : []);
      setEnrollment(Array.isArray(e) ? e.find((x: any) => x.courseId === id || x.course?.id === id) : null);
    } finally { setLoading(false); }
  }
  useEffect(() => { if (id) load(); }, [id]);

  async function enroll() {
    await fetch("/api/enrollments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: id }) });
    load();
  }
  async function mark(moduleId: string, contentId: string) {
    await fetch("/api/module-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId, contentId }) });
    setProgress(await fetch(`/api/module-progress?courseId=${id}`).then((r) => r.json()));
  }
  const mp = (mid: string) => progress.find((p) => p.moduleId === mid);
  const done = (mid: string, cid: string) => {
    try { return JSON.parse(mp(mid)?.contentsDone || "[]").includes(cid); } catch { return false; }
  };

  if (loading) return <DashboardShell role="STUDENT"><div className="py-16 text-center text-slate-500">Loading...</div></DashboardShell>;
  if (!course) return <DashboardShell role="STUDENT"><div className="py-16 text-center">Not found</div></DashboardShell>;

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6 max-w-4xl">
        <Link href="/student/courses" className="text-sm text-slate-500 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Courses</Link>
        <div className="bg-white border rounded-xl p-6">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{course.description}</p>}
          {!enrollment ? (
            <button onClick={enroll} className="mt-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">Enroll</button>
          ) : (
            <div className="mt-4"><div className="flex justify-between text-xs mb-1"><span>Progress</span><span>{Math.round(enrollment.progress || 0)}%</span></div>
              <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${enrollment.progress || 0}%` }} /></div></div>
          )}
        </div>
        {modules.map((mod: any, idx: number) => (
          <div key={mod.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center gap-2">
              {mp(mod.id)?.completedAt ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <h3 className="font-semibold">Module {idx + 1}: {mod.title}</h3>
            </div>
            <ul className="divide-y">
              {(mod.contents || []).map((c: any) => (
                <li key={c.id}>
                  <button type="button" disabled={!enrollment} onClick={async () => { setActive({ ...c, moduleId: mod.id }); if (enrollment) await mark(mod.id, c.id); }}
                    className="w-full px-5 py-3 flex items-center gap-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50">
                    {c.type === "VIDEO" ? <Video className="h-4 w-4 text-rose-500" /> : c.type === "PDF" ? <FileType className="h-4 w-4 text-amber-500" /> : <FileText className="h-4 w-4 text-sky-500" />}
                    <span className="flex-1 font-medium">{c.title}</span>
                    {done(mod.id, c.id) && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {!enrollment && <Lock className="h-3.5 w-3.5 text-slate-300" />}
                  </button>
                </li>
              ))}
            </ul>
            {mod.assessmentTest && (
              <div className="px-5 py-3 bg-slate-50 border-t flex justify-between items-center text-sm">
                <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-violet-600" />{mod.assessmentTest.title}
                  {mp(mod.id)?.assessmentPassed && <span className="text-xs text-emerald-600">Passed</span>}</span>
                {enrollment && <Link href={`/student/tests/${mod.assessmentTest.id}`} className="text-indigo-600 font-medium inline-flex items-center gap-1"><Play className="h-3.5 w-3.5" /> Quiz</Link>}
              </div>
            )}
          </div>
        ))}
        {course.finalTest && (
          <div className="bg-white border border-indigo-100 rounded-xl p-5">
            <h2 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Final assessment</h2>
            <p className="text-sm text-slate-500 mt-1">Pass all modules + final test for certificate.</p>
            {enrollment && <Link href={`/student/tests/${course.finalTest.id}`} className="mt-3 inline-flex items-center gap-1 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg"><Play className="h-4 w-4" /> Start final</Link>}
          </div>
        )}
        {active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setActive(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-4"><h3 className="font-semibold">{active.title}</h3><button onClick={() => setActive(null)} className="text-sm text-slate-500">Close</button></div>
              {active.type === "VIDEO" && active.url && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {(active.url.includes("youtube") || active.url.includes("youtu.be")) ? (
                    <iframe className="w-full h-full" src={active.url.replace("watch?v=", "embed/")} allowFullScreen />
                  ) : <video src={active.url} controls className="w-full h-full" />}
                </div>
              )}
              {active.type === "PDF" && active.url && <iframe src={active.url} className="w-full h-[70vh] border rounded-lg" />}
              {active.type === "TEXT" && <div className="text-sm whitespace-pre-wrap leading-relaxed">{active.body}</div>}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
