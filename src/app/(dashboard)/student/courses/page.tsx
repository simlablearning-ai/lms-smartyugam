"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BookOpen, Clock, ClipboardList, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  college?: { name: string } | null;
  department?: { name: string } | null;
  tests: { id: string; title: string; durationMinutes: number; totalMarks: number }[];
  enrollment: { id: string; progress: number; completedAt: string | null } | null;
  _count: { tests: number };
};

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/courses/student");
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function enroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) await load();
      else {
        const d = await res.json();
        alert(d.error || "Failed to enroll");
      }
    } catch {
      alert("Network error");
    } finally {
      setEnrolling(null);
    }
  }

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-slate-500 mt-1">Browse courses from your college and enroll to take assessments</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No courses available yet</p>
            <p className="text-sm text-slate-400 mt-1">Your college admin will publish courses soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const enrolled = !!c.enrollment;
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{c.title}</h3>
                      {c.code && <p className="text-xs text-slate-400 mt-0.5">{c.code}</p>}
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-sm text-slate-500 mt-3 line-clamp-2">{c.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {c.department?.name && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded-full">{c.department.name}</span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                      <ClipboardList className="h-3 w-3" />
                      {c.tests.length} test{c.tests.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {enrolled && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(c.enrollment!.progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, c.enrollment!.progress)}%` }}
                        />
                      </div>
                      {c.enrollment!.completedAt && (
                        <p className="text-xs text-emerald-600 mt-1 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-2">
                    {enrolled ? (
                      <Link
                        href={`/student/courses/${c.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                      >
                        Open course <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => enroll(c.id)}
                        disabled={enrolling === c.id}
                        className="flex-1 px-3 py-2 text-sm font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                      >
                        {enrolling === c.id ? "Enrolling..." : "Enroll"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
