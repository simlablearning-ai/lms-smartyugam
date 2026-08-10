"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import {
  Briefcase,
  Plus,
  Trash2,
  Users,
  ChevronRight,
  Building2,
  MapPin,
  IndianRupee,
  Search,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function SuperAdminPlacementPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [colleges, setColleges] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    title: "",
    companyName: "",
    location: "",
    jobType: "Full-time",
    description: "",
    requirements: "",
    skillsRequired: "",
    packageLpa: "",
    minCgpa: "",
    maxBacklogs: "",
    eligibleYears: "3,4",
    eligibleDepts: "",
    collegeId: "",
    status: "OPEN",
    applicationDeadline: "",
  });

  async function load() {
    setLoading(true);
    const [j, c] = await Promise.all([
      fetch("/api/placement/jobs").then((r) => r.json()),
      fetch("/api/colleges").then((r) => r.json()),
    ]);
    setJobs(Array.isArray(j) ? j : []);
    setColleges(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase();
      if (q && !j.title?.toLowerCase().includes(q) && !j.companyName?.toLowerCase().includes(q))
        return false;
      if (statusFilter && j.status !== statusFilter) return false;
      return true;
    });
  }, [jobs, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      companyName: "",
      location: "",
      jobType: "Full-time",
      description: "",
      requirements: "",
      skillsRequired: "",
      packageLpa: "",
      minCgpa: "",
      maxBacklogs: "",
      eligibleYears: "3,4",
      eligibleDepts: "",
      collegeId: "",
      status: "OPEN",
      applicationDeadline: "",
    });
    setError("");
    setModal(true);
  }

  function openEdit(job: any) {
    setEditing(job);
    setForm({
      title: job.title || "",
      companyName: job.companyName || "",
      location: job.location || "",
      jobType: job.jobType || "Full-time",
      description: job.description || "",
      requirements: job.requirements || "",
      skillsRequired: job.skillsRequired || "",
      packageLpa: job.packageLpa?.toString() || "",
      minCgpa: job.minCgpa?.toString() || "",
      maxBacklogs: job.maxBacklogs?.toString() || "",
      eligibleYears: job.eligibleYears || "",
      eligibleDepts: job.eligibleDepts || "",
      collegeId: job.collegeId || "",
      status: job.status || "OPEN",
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().slice(0, 16)
        : "",
    });
    setError("");
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/placement/jobs/${editing.id}` : "/api/placement/jobs";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setSaving(false);
        return;
      }
      setModal(false);
      load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete job "${title}"?`)) return;
    await fetch(`/api/placement/jobs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#e5e0d6] bg-gradient-to-r from-[#12151c] to-[#1c2433] text-white px-5 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight">Recruiter desk</h1>
              <p className="text-sm text-[#b8b2a6] mt-1">
                Post openings · Review applications · Shortlist & interview
              </p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-[#c45c26] hover:bg-[#a34a1c] text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              <Plus className="h-4 w-4" /> Post a job
            </button>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a948a]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs or companies"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-[#9a948a] focus:outline-none focus:ring-2 focus:ring-[#c45c26]/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-sm text-white"
            >
              <option value="" className="text-black">All statuses</option>
              <option value="OPEN" className="text-black">Open</option>
              <option value="DRAFT" className="text-black">Draft</option>
              <option value="CLOSED" className="text-black">Closed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Open jobs", v: jobs.filter((j) => j.status === "OPEN").length },
            {
              l: "Applications",
              v: jobs.reduce((s, j) => s + (j._count?.applications || 0), 0),
            },
            { l: "All postings", v: jobs.length },
            { l: "Closed", v: jobs.filter((j) => j.status === "CLOSED").length },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-[#e5e0d6] bg-white p-4">
              <p className="text-2xl font-bold text-[#1a1814]">{s.v}</p>
              <p className="text-xs text-[#6b6560] mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#6b6560]">{filtered.length} openings</p>
          {loading ? (
            <div className="py-16 text-center text-[#6b6560] text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d4cec3] bg-white py-16 text-center text-[#6b6560] text-sm">
              No jobs yet — post your first opening
            </div>
          ) : (
            filtered.map((j) => (
              <div
                key={j.id}
                className="rounded-2xl border border-[#e5e0d6] bg-white p-4 sm:p-5 hover:shadow-md hover:border-[#d4cfc4] transition-all"
              >
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#f3f0e9] border border-[#e5e0d6] flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-[#c45c26]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#1a1814] text-[15px]">{j.title}</p>
                        <p className="text-sm text-[#6b6560]">{j.companyName}</p>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                          j.status === "OPEN"
                            ? "bg-emerald-50 text-emerald-800"
                            : j.status === "DRAFT"
                            ? "bg-amber-50 text-amber-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>
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
                      {j.createdAt && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(j.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                    {j.skillsRequired && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {j.skillsRequired.split(",").slice(0, 5).map((s: string) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f0e9] border border-[#e5e0d6] text-[#5a554e]"
                          >
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#f0ebe3]">
                      <Link
                        href={`/super-admin/placement/${j.id}`}
                        className="text-xs font-semibold text-[#c45c26] inline-flex items-center gap-0.5"
                      >
                        View applicants <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => openEdit(j)}
                        className="text-xs text-[#6b6560] hover:text-[#1a1814]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(j.id, j.title)}
                        className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit job" : "Post a job"} size="lg">
        <form onSubmit={save} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Job title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="sy-input" />
            <input required placeholder="Company *" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="sy-input" />
            <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="sy-input" />
            <select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })} className="sy-input">
              <option>Full-time</option>
              <option>Internship</option>
              <option>Contract</option>
            </select>
            <input placeholder="Package (LPA)" value={form.packageLpa} onChange={(e) => setForm({ ...form, packageLpa: e.target.value })} className="sy-input" />
            <input placeholder="Min CGPA" value={form.minCgpa} onChange={(e) => setForm({ ...form, minCgpa: e.target.value })} className="sy-input" />
            <input placeholder="Max backlogs" value={form.maxBacklogs} onChange={(e) => setForm({ ...form, maxBacklogs: e.target.value })} className="sy-input" />
            <input placeholder="Eligible years (e.g. 3,4)" value={form.eligibleYears} onChange={(e) => setForm({ ...form, eligibleYears: e.target.value })} className="sy-input" />
            <input placeholder="Eligible depts (codes)" value={form.eligibleDepts} onChange={(e) => setForm({ ...form, eligibleDepts: e.target.value })} className="sy-input sm:col-span-2" />
            <input placeholder="Skills required (comma sep)" value={form.skillsRequired} onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })} className="sy-input sm:col-span-2" />
            <select value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })} className="sy-input">
              <option value="">All colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="sy-input">
              <option value="OPEN">OPEN</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CLOSED">CLOSED</option>
            </select>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#6b6560]">Deadline (optional)</label>
              <input type="datetime-local" value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} className="sy-input mt-1" />
            </div>
          </div>
          <textarea rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="sy-input" />
          <textarea rows={2} placeholder="Requirements" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="sy-input" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm rounded-xl hover:bg-[#efeae2]">Cancel</button>
            <button type="submit" disabled={saving} className="sy-btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
