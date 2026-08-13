"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loginId = email.trim();
      const res = await signIn("credentials", {
        email: loginId,
        password,
        redirect: false,
        callbackUrl: "/student",
      });
      if (res?.error) {
        setError("Invalid login ID or password. Check roll number and password.");
        setLoading(false);
        return;
      }
      // Small delay helps iOS Safari commit the session cookie before navigation
      await new Promise((r) => setTimeout(r, 150));
      const sessionRes = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      const session = await sessionRes.json();
      const role = session?.user?.role;
      // Full page navigation is more reliable on iOS than client router after login
      if (role === "SUPER_ADMIN") {
        window.location.assign("/super-admin");
      } else if (role === "COLLEGE_ADMIN") {
        window.location.assign("/college-admin");
      } else {
        window.location.assign("/student");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f3f0e9]">
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-[#12151c] text-[#f5f1ea]">
        <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(196,92,38,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(26,107,92,0.25), transparent 50%)" }} />
        <div className="relative inline-flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
            <img src="https://lms.smartyugam.com/logo.png" alt="SmartYugam" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">SmartYugam</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a948a]">Campus LMS</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="text-[#e0a070] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Learn · Assess · Place</p>
          <h1 className="font-display text-4xl xl:text-5xl font-medium leading-[1.15] text-[#faf8f4]">
            The campus desk for learning that actually sticks.
          </h1>
          <p className="mt-5 text-[#b8b2a6] text-base leading-relaxed">
            Courses, proctored tests, results, and placement — one calm workspace for colleges, faculty, and students.
          </p>
        </div>
        <p className="relative text-sm text-[#7a746a]">© {new Date().getFullYear()} SmartYugam</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <img src="https://lms.smartyugam.com/logo.png" alt="" className="h-9 w-auto" />
            <span className="font-semibold text-[#1a1814]">SmartYugam</span>
          </div>
          <h2 className="font-display text-3xl font-medium text-[#1a1814] tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-[#6b6560]">Students: use Roll Number. Admins: use email.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-1.5">Email or Roll Number</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a948a]" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Roll number or email"
                  className="sy-input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b6560] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a948a]" />
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="sy-input pl-10"
                />
              </div>
            </div>
            {error && <div className="text-sm text-[#a33] bg-[#fdecea] border border-[#f0c4c0] rounded-xl px-3 py-2.5">{error}</div>}
            <div className="text-right"><a href="/forgot-password" className="text-xs text-[#c45c26] font-medium">Forgot password?</a></div>
            <button type="submit" disabled={loading} className="sy-btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60">
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>) : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
