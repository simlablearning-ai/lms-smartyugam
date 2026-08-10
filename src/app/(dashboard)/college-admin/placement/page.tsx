"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Briefcase,
  Users,
  ChevronRight,
  Building2,
  MapPin,
  IndianRupee,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function CollegePlacementPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/placement/jobs").then((r) => r.json()),
      fetch("/api/placement/applications").then((r) => r.json()),
    ]).then(([j, a]) => {
      setJobs(Array.isArray(j) ? j : []);
      setApps(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);

  const placed = apps.filter((a) => a.status === "SELECTED").length;
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.companyName?.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <DashboardShell role="COLLEGE_ADMIN">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#e5e0d6] bg-gradient-to-r from-[#12151c] to-[#1c2433] text-white px-5 py-5 sm:px-6">
          <h1 className="font-display text-2xl font-medium tracking-tight">College placement</h1>
          <p className="text-sm text-[#b8b2a6] mt-1">
            Browse openings · Track applicants · Restrict students when needed
          </p>
          <div className="relative mt-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a948a]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs or companies"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-[#9a948a] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#e5e0d6] bg-white p-4">
            <p className="text-2xl font-bold">{jobs.filter((j) => j.status === "OPEN").length}</p>
            <p className="text-xs text-[#6b6560] mt-0.5">Open jobs</p>
          </div>
          <div className="rounded-xl border border-[#e5e0d6] bg-white p-4">
            <p className="text-2xl font-bold">{apps.length}</p>
            <p className="text-xs text-[#6b6560] mt-0.5">Applications (your college)</p>
          </div>
          <div className="rounded-xl border border-[#e5e0d6] bg-white p-4">
            <p className="text-2xl font-bold text-emerald-700">{placed}</p>
            <p className="text-xs text-[#6b6560] mt-0.5">Placed / selected</p>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#6b6560]">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d4cec3] bg-white py-16 text-center text-sm text-[#6b6560]">
              No jobs available
            </div>
          ) : (
            filtered.map((j) => (
              <div
                key={j.id}
                className="rounded-2xl border border-[#e5e0d6] bg-white p-4 sm:p-5 hover:shadow-md transition-all"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#f3f0e9] border border-[#e5e0d6] flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-[#c45c26]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a1814]">{j.title}</p>
                    <p className="text-sm text-[#6b6560]">{j.companyName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#6b6560]">
                      {j.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {j.location}
                        </span>
                      )}
                      {j.packageLpa != null && (
                        <span className="inline-flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" /> {j.packageLpa} LPA
                        </span>
                      )}
                      {j.jobType && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {j.jobType}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {j._count?.applications ?? 0} applied
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#f0ebe3]">
                      <Link
                        href={`/college-admin/placement/${j.id}`}
                        className="text-xs font-semibold text-[#c45c26] inline-flex items-center gap-0.5"
                      >
                        View / restrict applicants <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
