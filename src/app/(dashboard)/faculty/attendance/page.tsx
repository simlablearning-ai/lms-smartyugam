"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function FacultyAttendancePage() {
  const searchParams = useSearchParams();
  const initialCourse = searchParams.get("courseId") || "";
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState(initialCourse);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/faculty/me/courses")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setCourses(list);
        if (!courseId && list[0]) setCourseId(list[0].id);
      });
  }, []);

  async function loadRoster() {
    if (!courseId) return;
    setLoading(true);
    setMsg("");
    try {
      const enr = await fetch(`/api/enrollments?courseId=${courseId}`).then((r) => r.json()).catch(() => null);
      let roster: any[] = [];
      if (Array.isArray(enr)) {
        roster = enr.map((e: any) => e.student || e).filter((s: any) => s?.id);
      }
      // Fallback: attendance records empty until save
      if (!roster.length) {
        // try courses student list via a soft endpoint — use enrollments alternative
        const alt = await fetch(`/api/courses/${courseId}`).then((r) => r.json()).catch(() => null);
        if (alt?.enrollments) {
          roster = alt.enrollments.map((e: any) => e.student).filter(Boolean);
        }
      }
      setStudents(roster);
      const m: Record<string, "PRESENT" | "ABSENT"> = {};
      roster.forEach((s) => {
        m[s.id] = "PRESENT";
      });
      // load existing session
      const existing = await fetch(
        `/api/attendance?courseId=${courseId}&source=CLASS&from=${date}&to=${date}`
      ).then((r) => r.json());
      if (Array.isArray(existing)) {
        existing.forEach((r: any) => {
          if (r.studentId) m[r.studentId] = r.status === "ABSENT" ? "ABSENT" : "PRESENT";
        });
      }
      setMarks(m);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (courseId && date) loadRoster();
  }, [courseId, date]);

  async function save() {
    if (!courseId || !date) return;
    setSaving(true);
    setMsg("");
    try {
      const records = Object.entries(marks).map(([studentId, status]) => ({ studentId, status }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, date, records }),
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.error || "Failed");
      else setMsg(`Saved ${records.length} records`);
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  function markAll(status: "PRESENT" | "ABSENT") {
    const m: Record<string, "PRESENT" | "ABSENT"> = {};
    students.forEach((s) => {
      m[s.id] = status;
    });
    setMarks(m);
  }

  return (
    <DashboardShell role="FACULTY">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">Select course and date, then mark Present / Absent</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Course *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg">
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg" />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => markAll("PRESENT")} className="px-3 py-2 text-xs border rounded-lg">All present</button>
            <button type="button" onClick={() => markAll("ABSENT")} className="px-3 py-2 text-xs border rounded-lg">All absent</button>
          </div>
        </div>

        {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{msg}</div>}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading roster...</p>
          ) : !courseId ? (
            <p className="p-8 text-center text-slate-500">Select a course first</p>
          ) : students.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No enrolled students found for this course</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Roll</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-xs font-mono">{s.rollNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={marks[s.id] || "PRESENT"}
                        onChange={(e) =>
                          setMarks((m) => ({
                            ...m,
                            [s.id]: e.target.value as "PRESENT" | "ABSENT",
                          }))
                        }
                        className="px-2 py-1 text-sm border rounded-lg"
                      >
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving || !courseId || !students.length}
            onClick={save}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save attendance"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
