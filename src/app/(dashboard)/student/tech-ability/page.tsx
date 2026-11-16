"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import Link from "next/link";
import { Code2, Clock, Shield, ChevronRight } from "lucide-react";
import { checkTestLive, formatIst } from "@/lib/test-live";

type TechTest = {
  id: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  totalMarks: number;
  isProctored: boolean;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  _count: { problems: number; attempts: number };
};

export default function StudentTechAbilityPage() {
  const [tests, setTests] = useState<TechTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tech-ability/tests")
      .then((r) => r.json())
      .then((data) => setTests(Array.isArray(data) ? data : []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">TechAbility</h1>
          <p className="text-slate-500 mt-1">Coding assessments assigned to you</p>
        </div>

        {loading ? (
          <p className="text-slate-500 py-12 text-center">Loading...</p>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Code2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No coding tests assigned yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.map((t) => {
              const live = checkTestLive(t);
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:border-violet-200 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Code2 className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900 truncate">{t.title}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t._count.problems} problem{t._count.problems !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                    <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <Clock className="h-3 w-3" /> {t.durationMinutes} min
                    </span>
                    <span className="bg-slate-50 px-2 py-1 rounded">{t.totalMarks} marks</span>
                    {t.isProctored && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded">
                        <Shield className="h-3 w-3" /> Proctored
                      </span>
                    )}
                  </div>
                  {(t.startTime || t.endTime) && (
                    <p className="text-[11px] text-slate-400 mb-3">
                      {t.startTime && <>Opens {formatIst(t.startTime)} · </>}
                      {t.endTime && <>Closes {formatIst(t.endTime)}</>}
                    </p>
                  )}
                  <div className="mt-auto">
                    {live.live ? (
                      <Link
                        href={`/student/tech-ability/${t.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
                      >
                        Start coding <ChevronRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-400">{live.reason || "Not live"}</span>
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
