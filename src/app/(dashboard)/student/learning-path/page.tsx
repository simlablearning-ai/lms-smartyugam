"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { calculateSkillLevel } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  ArrowRight,
  Play,
} from "lucide-react";
import Link from "next/link";

type PathItem = {
  enrollmentId: string;
  progress: number;
  status: "completed" | "ongoing" | "not_started";
  enrolledAt: string;
  completedAt: string | null;
  avgScore: number | null;
  course: {
    id: string;
    title: string;
    code: string | null;
    description: string | null;
    college?: { name: string } | null;
    department?: { name: string } | null;
  };
  tests: {
    testId: string;
    title: string;
    percentage: number | null;
    passed: boolean;
    attempted: boolean;
  }[];
};

export default function LearningPathPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const skill = calculateSkillLevel(data?.summary?.avgPercentage || 0);

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Path</h1>
          <p className="text-slate-500 mt-1">
            Your enrolled courses — ongoing, completed, and next steps
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">Loading your path...</div>
        ) : !data ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600">Could not load progress.</p>
          </div>
        ) : (
          <>
            {/* Skill + summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-indigo-100 text-sm font-medium flex items-center gap-1.5">
                    <Target className="h-4 w-4" /> Your Skill Level
                  </p>
                  <p className="text-3xl font-bold mt-1">{skill.level}</p>
                  <p className="text-indigo-100 text-sm mt-1">
                    Avg score {data.summary.avgPercentage}% · {data.summary.totalAttempts}{" "}
                    assessment(s)
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-2xl font-bold">{data.summary.ongoing}</p>
                    <p className="text-xs text-indigo-100">Ongoing</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-2xl font-bold">{data.summary.completed}</p>
                    <p className="text-xs text-indigo-100">Completed</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3">
                    <p className="text-2xl font-bold">{data.summary.totalCourses}</p>
                    <p className="text-xs text-indigo-100">Enrolled</p>
                  </div>
                </div>
              </div>
            </div>

            {data.path.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No courses in your path yet</p>
                <p className="text-sm text-slate-400 mt-1 mb-4">
                  Enroll in a course to start your learning path
                </p>
                <Link
                  href="/student/courses"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Browse courses <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {/* Ongoing */}
            {data.ongoing?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" /> Ongoing courses
                </h2>
                <div className="space-y-3">
                  {data.ongoing.map((item: PathItem) => (
                    <CourseCard key={item.enrollmentId} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Not started */}
            {data.notStarted?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Circle className="h-5 w-5 text-slate-400" /> Not started
                </h2>
                <div className="space-y-3">
                  {data.notStarted.map((item: PathItem) => (
                    <CourseCard key={item.enrollmentId} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {data.completed?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Completed
                </h2>
                <div className="space-y-3">
                  {data.completed.map((item: PathItem) => (
                    <CourseCard key={item.enrollmentId} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function CourseCard({ item }: { item: PathItem }) {
  const statusColor =
    item.status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : item.status === "ongoing"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{item.course.title}</h3>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
              {item.course.code && <span>{item.course.code}</span>}
              {item.course.department?.name && <span>· {item.course.department.name}</span>}
              <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                {item.status === "completed"
                  ? "Completed"
                  : item.status === "ongoing"
                  ? "Ongoing"
                  : "Not started"}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/student/courses/${item.course.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
        >
          {item.status === "completed" ? "Review" : "Continue"} <Play className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span>
            {item.progress}%
            {item.avgScore != null && ` · avg ${Math.round(item.avgScore)}%`}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              item.status === "completed" ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${Math.min(100, item.progress)}%` }}
          />
        </div>
      </div>

      {item.tests.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
          {item.tests.map((t) => (
            <li key={t.testId} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 flex items-center gap-2 min-w-0">
                {t.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : t.attempted ? (
                  <Circle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                )}
                <span className="truncate">{t.title}</span>
              </span>
              <span className="text-xs text-slate-500 shrink-0 ml-2">
                {t.percentage != null ? `${Math.round(t.percentage)}%` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
