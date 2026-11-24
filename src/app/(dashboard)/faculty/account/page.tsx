"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useSession } from "next-auth/react";

export default function FacultyAccountPage() {
  const { data: session } = useSession();
  return (
    <DashboardShell role="FACULTY">
      <div className="space-y-4 max-w-lg">
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <div className="bg-white rounded-xl border p-5 space-y-2 text-sm">
          <p><span className="text-slate-500">Name:</span> {session?.user?.name}</p>
          <p><span className="text-slate-500">Email:</span> {session?.user?.email}</p>
          <p><span className="text-slate-500">Role:</span> Faculty</p>
        </div>
      </div>
    </DashboardShell>
  );
}
