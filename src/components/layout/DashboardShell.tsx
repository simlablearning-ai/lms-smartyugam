"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  FileQuestion,
  ClipboardList,
  BarChart3,
  Award,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Settings,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
  { label: "Colleges", href: "/super-admin/colleges", icon: Building2 },
  { label: "Departments", href: "/super-admin/departments", icon: GraduationCap },
  { label: "Students", href: "/super-admin/students", icon: Users },
  { label: "Courses", href: "/super-admin/courses", icon: BookOpen },
  { label: "Question Banks", href: "/super-admin/question-banks", icon: FolderOpen },
  { label: "Questions", href: "/super-admin/questions", icon: FileQuestion },
  { label: "Tests", href: "/super-admin/tests", icon: ClipboardList },
  { label: "Results", href: "/super-admin/results", icon: BarChart3 },
  { label: "Reports", href: "/super-admin/reports", icon: BarChart3 },
];

const collegeAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/college-admin", icon: LayoutDashboard },
  { label: "Departments", href: "/college-admin/departments", icon: GraduationCap },
  { label: "Students", href: "/college-admin/students", icon: Users },
  { label: "Courses", href: "/college-admin/courses", icon: BookOpen },
  { label: "Question Bank", href: "/college-admin/questions", icon: FileQuestion },
  { label: "Tests", href: "/college-admin/tests", icon: ClipboardList },
  { label: "Results", href: "/college-admin/results", icon: BarChart3 },
  { label: "Reports", href: "/college-admin/reports", icon: BarChart3 },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "My Courses", href: "/student/courses", icon: BookOpen },
  { label: "Assessments", href: "/student/tests", icon: ClipboardList },
  { label: "Certificates", href: "/student/certificates", icon: Award },
  { label: "Learning Path", href: "/student/learning-path", icon: BarChart3 },
];

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "SUPER_ADMIN" | "COLLEGE_ADMIN" | "STUDENT";
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav =
    role === "SUPER_ADMIN"
      ? superAdminNav
      : role === "COLLEGE_ADMIN"
      ? collegeAdminNav
      : studentNav;

  const roleLabel =
    role === "SUPER_ADMIN"
      ? "Super Admin"
      : role === "COLLEGE_ADMIN"
      ? "College Admin"
      : "Student";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
          <img
            src="https://lms.smartyugam.com/logo.png"
            alt="Logo"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 leading-tight">
              SmartYugam
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              LMS Portal
            </span>
          </div>
          <button
            className="ml-auto lg:hidden p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== `/${role.toLowerCase().replace("_", "-")}` &&
                pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5",
                    active ? "text-indigo-600" : "text-slate-400"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
              {roleLabel}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
