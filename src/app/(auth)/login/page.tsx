"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      // Redirect based on role – we fetch session after login
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (session?.user?.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (session?.user?.role === "COLLEGE_ADMIN") {
        router.push("/college-admin");
      } else {
        router.push("/student");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-12 flex-col justify-between">
        <div>
          <img
            src="https://lms.smartyugam.com/logo.png"
            alt="SmartYugam LMS"
            className="h-12 w-auto object-contain brightness-0 invert"
          />
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Learning<br />Management System
          </h1>
          <p className="text-indigo-100 text-lg max-w-md">
            Multi-tenant platform for colleges. Manage courses, assessments,
            proctored tests and certificates — all in one place.
          </p>
        </div>
        <p className="text-indigo-200 text-sm">
          © {new Date().getFullYear()} SmartYugam. All rights reserved.
        </p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <img
              src="https://lms.smartyugam.com/logo.png"
              alt="SmartYugam LMS"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-1">
              Welcome back
            </h2>
            <p className="text-slate-500 mb-8">
              Sign in to your LMS account
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center mb-3">
                Demo accounts (password: <code className="bg-slate-100 px-1 rounded">password123</code>)
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Super Admin</span>
                  <span className="font-mono">superadmin@smartyugam.com</span>
                </div>
                <div className="flex justify-between">
                  <span>College Admin</span>
                  <span className="font-mono">admin@syit.edu</span>
                </div>
                <div className="flex justify-between">
                  <span>Student</span>
                  <span className="font-mono">student1@syit.edu</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
