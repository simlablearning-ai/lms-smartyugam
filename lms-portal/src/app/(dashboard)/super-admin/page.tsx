import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Building2,
  Users,
  BookOpen,
  ClipboardList,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function SuperAdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const [
    collegeCount,
    studentCount,
    courseCount,
    testCount,
    departmentCount,
    recentColleges,
  ] = await Promise.all([
    prisma.college.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.course.count({ where: { isActive: true } }),
    prisma.test.count(),
    prisma.department.count({ where: { isActive: true } }),
    prisma.college.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, departments: true } },
      },
    }),
  ]);

  const stats = [
    {
      label: "Colleges",
      value: collegeCount,
      icon: Building2,
      href: "/super-admin/colleges",
      color: "bg-indigo-500",
    },
    {
      label: "Departments",
      value: departmentCount,
      icon: GraduationCap,
      href: "/super-admin/departments",
      color: "bg-violet-500",
    },
    {
      label: "Students",
      value: studentCount,
      icon: Users,
      href: "/super-admin/students",
      color: "bg-emerald-500",
    },
    {
      label: "Courses",
      value: courseCount,
      icon: BookOpen,
      href: "/super-admin/courses",
      color: "bg-amber-500",
    },
    {
      label: "Tests",
      value: testCount,
      icon: ClipboardList,
      href: "/super-admin/tests",
      color: "bg-rose-500",
    },
  ];

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Super Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Welcome back, {session.user.name}. Manage the entire LMS platform.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center text-white`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent colleges */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Colleges</h2>
            <Link
              href="/super-admin/colleges"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentColleges.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-500 text-sm">
                No colleges yet. Create your first college to get started.
              </p>
            ) : (
              recentColleges.map((college) => (
                <div
                  key={college.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{college.name}</p>
                      <p className="text-xs text-slate-500">
                        Code: {college.code} · {college.city || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{college._count.departments} depts</p>
                    <p>{college._count.users} users</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/super-admin/colleges?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Building2 className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Add College
            </span>
          </Link>
          <Link
            href="/super-admin/students?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Users className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Add Student
            </span>
          </Link>
          <Link
            href="/super-admin/tests?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Create Test
            </span>
          </Link>
          <Link
            href="/super-admin/reports"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              View Reports
            </span>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
