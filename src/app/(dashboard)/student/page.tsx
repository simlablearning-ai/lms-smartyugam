import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { calculateSkillLevel, formatDate } from "@/lib/utils";
import {
  BookOpen,
  ClipboardList,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  const studentId = session.user.id;

  const [enrollments, attempts, certificates, availableTests] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.testAttempt.findMany({
        where: { studentId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        include: { test: true },
        orderBy: { submittedAt: "desc" },
        take: 10,
      }),
      prisma.certificate.findMany({
        where: { studentId },
        include: { course: true },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.test.findMany({
        where: {
          collegeId: session.user.collegeId!,
          status: "PUBLISHED",
          OR: [
            { departmentId: session.user.departmentId },
            { departmentId: null },
          ],
        },
        include: {
          _count: { select: { attempts: true } },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // Calculate overall skill level from attempts
  const avgPercentage =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
        attempts.length
      : 0;
  const skill = calculateSkillLevel(avgPercentage);

  // Learning path: courses sorted by progress
  const learningPath = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    progress: e.progress,
    completed: !!e.completedAt,
  }));

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hello, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Track your learning progress and take assessments.
          </p>
        </div>

        {/* Skill level card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-100 text-sm font-medium">
                Your Skill Level
              </p>
              <p className="text-3xl font-bold mt-1">{skill.level}</p>
              <p className="text-indigo-100 text-sm mt-1">
                Based on {attempts.length} completed assessment
                {attempts.length !== 1 ? "s" : ""} · Avg score{" "}
                {avgPercentage.toFixed(0)}%
              </p>
            </div>
            <div className="w-full sm:w-48">
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${skill.progress}%` }}
                />
              </div>
              <p className="text-xs text-indigo-100 mt-1.5 text-right">
                {skill.progress}% to next level
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <BookOpen className="h-5 w-5 text-indigo-600 mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {enrollments.length}
            </p>
            <p className="text-sm text-slate-500">Enrolled Courses</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <ClipboardList className="h-5 w-5 text-rose-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {attempts.length}
            </p>
            <p className="text-sm text-slate-500">Tests Taken</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Award className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {certificates.length}
            </p>
            <p className="text-sm text-slate-500">Certificates</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              {avgPercentage.toFixed(0)}%
            </p>
            <p className="text-sm text-slate-500">Avg Score</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Learning Path */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Learning Path</h2>
              <Link
                href="/student/learning-path"
                className="text-sm text-indigo-600 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {learningPath.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No courses enrolled yet.
                </p>
              ) : (
                learningPath.slice(0, 4).map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 truncate">
                        {item.title}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {item.progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.completed ? "bg-emerald-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Tests */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                Available Assessments
              </h2>
              <Link
                href="/student/tests"
                className="text-sm text-indigo-600 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {availableTests.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No tests available right now.
                </p>
              ) : (
                availableTests.map((test) => (
                  <div
                    key={test.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {test.title}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {test.durationMinutes} min · {test.totalMarks} marks
                        {test.isProctored && (
                          <span className="ml-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium">
                            Proctored
                          </span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/student/tests/${test.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg"
                    >
                      Start
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Certificates preview */}
        {certificates.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Your Certificates</h2>
              <Link
                href="/student/certificates"
                className="text-sm text-indigo-600 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              {certificates.slice(0, 2).map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
                >
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Award className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {cert.course.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Issued {formatDate(cert.issuedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
