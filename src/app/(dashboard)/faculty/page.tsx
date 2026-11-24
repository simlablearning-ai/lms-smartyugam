"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { BookOpen, Users, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function FacultyDashboard() {
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty dashboard</h1>
          <p className="text-slate-500 mt-1">Only courses assigned to you are listed</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <BookOpen className="h-5 w-5 text-indigo-600 mb-2" />
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-sm text-slate-500">Assigned courses</p>
          </div>
          <Link href="/faculty/attendance" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200">
            <Users className="h-5 w-5 text-emerald-600 mb-2" />
            <p className="font-semibold text-slate-900">Mark attendance</p>
            <p className="text-sm text-slate-500">Course sessions</p>
          </Link>
          <Link href="/faculty/materials" className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-200">
            <FolderOpen className="h-5 w-5 text-amber-600 mb-2" />
            <p className="font-semibold text-slate-900">Materials</p>
            <p className="text-sm text-slate-500">Upload for your courses</p>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b font-semibold">My courses</div>
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading...</p>
          ) : courses.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No courses assigned yet. Ask your college admin.</p>
          ) : (
            <ul className="divide-y">
              {courses.map((c) => (
                <li key={c.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {c.department?.name || c.college?.name || ""} · {c._count?.enrollments ?? 0} students
                    </p>
                  </div>
                  <Link href={`/faculty/attendance?courseId=${c.id}`} className="text-sm text-indigo-600 font-medium">
                    Attendance
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
