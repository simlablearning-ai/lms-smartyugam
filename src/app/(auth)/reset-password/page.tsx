"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    setOk(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return <p className="text-sm text-red-600">Missing reset token. Request a new link.</p>;
  }

  if (ok) {
    return <p className="text-sm text-emerald-700">Password updated. Redirecting to sign in…</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 6 characters)"
        className="sy-input"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="sy-btn-primary w-full py-2.5 text-sm">
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f0e9] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e0d6] bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="font-display text-2xl font-medium text-[#1a1814]">Set new password</h1>
        <p className="text-sm text-[#6b6560] mt-1 mb-6">Choose a strong password for your LMS account.</p>
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <p className="mt-6 text-sm text-center">
          <Link href="/login" className="text-[#c45c26] font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
