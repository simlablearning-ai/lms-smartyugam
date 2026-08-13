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
  Briefcase,
  Award,
  LogOut,
  Menu,
  X,
  GraduationCap,
  FolderOpen,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

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
  { label: "Placement", href: "/super-admin/placement", icon: Briefcase },
  { label: "Reports", href: "/super-admin/reports", icon: BarChart3 },
  { label: "Calendar", href: "/super-admin/calendar", icon: CalendarDays },
];

const collegeAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/college-admin", icon: LayoutDashboard },
  { label: "Departments", href: "/college-admin/departments", icon: GraduationCap },
  { label: "Students", href: "/college-admin/students", icon: Users },
  { label: "Courses", href: "/college-admin/courses", icon: BookOpen },
  { label: "Question Bank", href: "/college-admin/questions", icon: FileQuestion },
  { label: "Tests", href: "/college-admin/tests", icon: ClipboardList },
  { label: "Results", href: "/college-admin/results", icon: BarChart3 },
  { label: "Placement", href: "/college-admin/placement", icon: Briefcase },
  { label: "Reports", href: "/college-admin/reports", icon: BarChart3 },
  { label: "Calendar", href: "/college-admin/calendar", icon: CalendarDays },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", href: "/student", icon: LayoutDashboard },
  { label: "My Courses", href: "/student/courses", icon: BookOpen },
  { label: "Assessments", href: "/student/tests", icon: ClipboardList },
  { label: "Certificates", href: "/student/certificates", icon: Award },
  { label: "Learning Path", href: "/student/learning-path", icon: BarChart3 },
  { label: "Placement", href: "/student/placement", icon: Briefcase },
  { label: "Account", href: "/student/account", icon: Settings },
  { label: "Calendar", href: "/student/calendar", icon: CalendarDays },
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
    <div className="sy-shell">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#12151c]/50 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sy-sidebar fixed lg:static inset-y-0 left-0 z-50 w-[17rem] flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-[4.25rem] flex items-center gap-3 px-5 border-b border-white/5">
          <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="https://lms.smartyugam.com/logo.png"
              alt="SmartYugam"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#faf8f4] tracking-tight leading-tight">
              SmartYugam
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9a948a]">
              Campus LMS
            </p>
          </div>
          <button className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-[#c9c3b8]" />
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          <p className="px-3 text-[10px] uppercase tracking-[0.16em] text-[#7a746a] mb-2">
            Navigate
          </p>
          <nav className="space-y-0.5">
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
                  className={cn("sy-nav-item", active && "active")}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#f0a070]" : "text-[#8a847a]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3 border-t border-white/5">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#c45c26] to-[#8a3d14] flex items-center justify-center text-white font-semibold text-sm shadow-inner">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f5f1ea] truncate">
                  {session?.user?.name}
                </p>
                <p className="text-[11px] text-[#9a948a] truncate">{roleLabel}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#c9c3b8] hover:text-white hover:bg-white/8 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[4.25rem] flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-30 bg-[rgba(243,240,233,0.85)] backdrop-blur-md border-b border-[#e5e0d6]/80">
          <button
            className="lg:hidden p-2 -ml-1 rounded-xl hover:bg-black/5"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-[#3d3a35]" />
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <span className="sy-badge bg-[#f3e4d9] text-[#a34a1c] border border-[#e8cbb8]">
            {roleLabel}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <div className="sy-page max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
