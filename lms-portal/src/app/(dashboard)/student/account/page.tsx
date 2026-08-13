"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function StudentAccountPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(d.error || "Failed");
      return;
    }
    setMsg("Password updated successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <DashboardShell role="STUDENT">
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-2xl font-medium text-[#1a1814]">My account</h1>
          <p className="text-sm text-[#6b6560] mt-1">Login details and password</p>
        </div>

        <div className="rounded-2xl border border-[#e5e0d6] bg-white p-5 space-y-2 text-sm">
          <p><span className="text-[#6b6560]">Name:</span> <strong>{session?.user?.name}</strong></p>
          <p>
            <span className="text-[#6b6560]">Login ID (Roll Number):</span>{" "}
            <strong className="font-mono">{(session?.user as any)?.rollNumber || "—"}</strong>
          </p>
          <p><span className="text-[#6b6560]">Email:</span> {session?.user?.email || "—"}</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-[#e5e0d6] bg-white p-5 space-y-3">
          <h2 className="font-semibold text-[#1a1814]">Change password</h2>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="sy-input"
          />
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
            className="sy-input"
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="sy-input"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <button type="submit" disabled={saving} className="sy-btn-primary px-4 py-2.5 text-sm">
            {saving ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </DashboardShell>
  );
}
