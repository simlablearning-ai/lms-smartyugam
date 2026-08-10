import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Users,
  BookOpen,
  ClipboardList,
  GraduationCap,
  FileQuestion,
  Award,
} from "lucide-react";
import Link from "next/link";

export default async function CollegeAdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "COLLEGE_ADMIN") {
    redirect("/login");
  }

  const collegeId = session.user.collegeId!;

  const [
    departmentCount,
    studentCount,
    courseCount,
    testCount,
    questionCount,
    recentTests,
  ] = await Promise.all([
    prisma.department.count({ where: { collegeId, isActive: true } }),
    prisma.user.count({
      where: { collegeId, role: "STUDENT", isActive: true },
    }),
    prisma.course.count({ where: { collegeId, isActive: true } }),
    prisma.test.count({ where: { collegeId } }),
    prisma.question.count({ where: { collegeId, isActive: true } }),
    prisma.test.findMany({
      where: { collegeId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        department: true,
        _count: { select: { attempts: true } },
      },
    }),
  ]);

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  const stats = [
    {
      label: "Departments",
      value: departmentCount,
      icon: GraduationCap,
      href: "/college-admin/departments",
      color: "bg-violet-500",
    },
    {
      label: "Students",
      value: studentCount,
      icon: Users,
      href: "/college-admin/students",
      color: "bg-emerald-500",
    },
    {
      label: "Courses",
      value: courseCount,
      icon: BookOpen,
      href: "/college-admin/courses",
      color: "bg-amber-500",
    },
    {
      label: "Tests",
      value: testCount,
      icon: ClipboardList,
      href: "/college-admin/tests",
      color: "bg-rose-500",
    },
    {
      label: "Questions",
      value: questionCount,
      icon: FileQuestion,
      href: "/college-admin/questions",
      color: "bg-indigo-500",
    },
  ];

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            College Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            {college?.name || "Your College"} · Welcome, {session.user.name}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div
                  className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center text-white mb-3`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent Tests</h2>
            <Link
              href="/college-admin/tests"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Manage tests
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTests.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-500 text-sm">
                No tests created yet.
              </p>
            ) : (
              recentTests.map((test) => (
                <div
                  key={test.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{test.title}</p>
                    <p className="text-xs text-slate-500">
                      {test.department?.name || "All Depts"} ·{" "}
                      {test.durationMinutes} min · {test.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                      {test._count.attempts} attempts
                    </p>
                    <p className="text-xs text-slate-500">
                      {test.totalMarks} marks
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/college-admin/students?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Users className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Add Student
            </span>
          </Link>
          <Link
            href="/college-admin/tests?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Create Assessment
            </span>
          </Link>
          <Link
            href="/college-admin/questions?action=create"
            className="flex items-center gap-3 p-4 bg-white border border-dashed border-slate-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <FileQuestion className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              Add Question
            </span>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
