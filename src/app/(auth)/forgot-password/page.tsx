"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f0e9] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e0d6] bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="font-display text-2xl font-medium text-[#1a1814]">Forgot password</h1>
        <p className="text-sm text-[#6b6560] mt-1">We'll email you a reset link if the account exists.</p>
        {sent ? (
          <p className="mt-6 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-3">
            If an account exists for that email, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="sy-input"
            />
            <button type="submit" disabled={loading} className="sy-btn-primary w-full py-2.5 text-sm">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <p className="mt-6 text-sm text-center">
          <Link href="/login" className="text-[#c45c26] font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
