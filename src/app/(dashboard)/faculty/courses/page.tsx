"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import Link from "next/link";

export default function FacultyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/faculty/me/courses")
      .then((r) => r.json())
      .then((d) => setCourses(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="FACULTY">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading...</p>
          ) : courses.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No assigned courses</p>
          ) : (
            <ul className="divide-y">
              {courses.map((c) => (
                <li key={c.id} className="px-6 py-4 flex justify-between">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-slate-500">{c._count?.enrollments ?? 0} students · {c._count?.materials ?? 0} materials</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link href={`/faculty/attendance?courseId=${c.id}`} className="text-indigo-600">Attendance</Link>
                    <Link href={`/faculty/materials?courseId=${c.id}`} className="text-indigo-600">Materials</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
