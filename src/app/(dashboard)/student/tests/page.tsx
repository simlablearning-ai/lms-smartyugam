"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ClipboardList, Clock, Shield, Play } from "lucide-react";
import Link from "next/link";

type Test = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalMarks: number;
  isProctored: boolean;
  maxAttempts: number;
  _count: { attempts: number; questions: number };
};

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tests")
      .then((r) => r.json())
      .then((data) => setTests(Array.isArray(data) ? data : []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          <p className="text-slate-500 mt-1">Available tests for you</p>
        </div>

        {loading ? (
          <p className="text-slate-500 text-center py-12">Loading...</p>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            No published tests available right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-rose-600" />
                  </div>
                  {test.isProctored && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                      <Shield className="h-3 w-3" /> Proctored
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{test.title}</h3>
                <p className="text-[11px] mb-2">
                  {test.course?.title ? (
                    <span className="text-indigo-600 font-medium">Course: {test.course.title}</span>
                  ) : (
                    <span className="text-amber-700 font-medium">Individual test</span>
                  )}
                </p>
                {test.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{test.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {test.durationMinutes} min
                  </span>
                  <span>{test.totalMarks} marks</span>
                  <span>{test._count.questions} Qs</span>
                </div>
                <Link
                  href={`/student/tests/${test.id}`}
                  className="inline-flex items-center gap-2 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  <Play className="h-4 w-4" /> Start Test
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
