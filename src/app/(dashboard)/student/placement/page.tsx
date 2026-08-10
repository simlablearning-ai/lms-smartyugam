"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import {
  Briefcase,
  Building2,
  MapPin,
  Search,
  IndianRupee,
  Clock,
  CheckCircle2,
  User,
  Filter,
  X,
  ChevronRight,
} from "lucide-react";

type Tab = "jobs" | "profile" | "applications";

export default function StudentPlacementPage() {
  const [profileData, setProfileData] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApps, setMyApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("jobs");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [packageFilter, setPackageFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyJob, setApplyJob] = useState<any>(null);
  const [appForm, setAppForm] = useState({
    appSkills: "",
    appHeadline: "",
    coverLetter: "",
    appResume: "",
    resumeFileName: "",
  });
  const [form, setForm] = useState({
    headline: "",
    summary: "",
    phone: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    resumeUrl: "",
    skills: "",
    cgpa: "",
    backlogs: "0",
  });

  async function load() {
    setLoading(true);
    const [p, j, a] = await Promise.all([
      fetch("/api/placement/profile").then((r) => r.json()),
      fetch("/api/placement/jobs").then((r) => r.json()),
      fetch("/api/placement/applications").then((r) => r.json()),
    ]);
    setProfileData(p);
    setJobs(Array.isArray(j) ? j : []);
    setMyApps(Array.isArray(a) ? a : []);
    const pr = p?.profile;
    if (pr) {
      setForm({
        headline: pr.headline || "",
        summary: pr.summary || "",
        phone: pr.phone || "",
        location: pr.location || "",
        linkedinUrl: pr.linkedinUrl || "",
        githubUrl: pr.githubUrl || "",
        portfolioUrl: pr.portfolioUrl || "",
        resumeUrl: pr.resumeUrl || "",
        skills: pr.skills || "",
        cgpa: pr.cgpa?.toString() || "",
        backlogs: pr.backlogs?.toString() || "0",
      });
    }
    if (!pr?.isComplete) setTab("profile");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.location && set.add(j.location));
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase();
      if (
        q &&
        !j.title?.toLowerCase().includes(q) &&
        !j.companyName?.toLowerCase().includes(q) &&
        !j.skillsRequired?.toLowerCase().includes(q)
      )
        return false;
      if (locationFilter && j.location !== locationFilter) return false;
      if (typeFilter && j.jobType !== typeFilter) return false;
      if (packageFilter === "0-5" && !(j.packageLpa != null && j.packageLpa < 5)) return false;
      if (packageFilter === "5-10" && !(j.packageLpa != null && j.packageLpa >= 5 && j.packageLpa < 10))
        return false;
      if (packageFilter === "10+" && !(j.packageLpa != null && j.packageLpa >= 10)) return false;
      return true;
    });
  }, [jobs, search, locationFilter, typeFilter, packageFilter]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/placement/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setMsg("Profile saved successfully");
    load();
  }

  async function openJob(id: string) {
    setDetailLoading(true);
    setError("");
    setMsg("");
    const d = await fetch(`/api/placement/jobs/${id}`).then((r) => r.json());
    setSelectedJob(d.error ? null : d);
    setDetailLoading(false);
  }

  function openApplyModal(job: any) {
    const pr = profileData?.profile;
    setApplyJob(job);
    setAppForm({
      appSkills: pr?.skills || "",
      appHeadline: pr?.headline || "",
      coverLetter: "",
      appResume: pr?.resumeUrl || "",
      resumeFileName: pr?.resumeUrl ? "Profile resume link" : "",
    });
    setError("");
    setMsg("");
    setShowApplyModal(true);
  }

  async function onResumeFile(file: File | null) {
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setError("Resume must be under 2.5 MB");
      return;
    }
    const ok = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
    ].includes(file.type) || /\.(pdf|doc|docx|png|jpg|jpeg)$/i.test(file.name);
    if (!ok) {
      setError("Upload PDF, DOC, DOCX, or image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAppForm((f) => ({
        ...f,
        appResume: String(reader.result || ""),
        resumeFileName: file.name,
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function submitApplication() {
    if (!applyJob?.id) return;
    setSaving(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/placement/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: applyJob.id,
        appSkills: appForm.appSkills,
        appHeadline: appForm.appHeadline,
        coverLetter: appForm.coverLetter,
        appResume: appForm.appResume,
        resumeFileName: appForm.resumeFileName,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not apply");
      return;
    }
    setMsg(`Applied successfully · Match score ${data.score}`);
    setShowApplyModal(false);
    await load();
    openJob(applyJob.id);
  }

  const profileComplete = profileData?.profile?.isComplete;
  const profilePct = profileComplete
    ? 100
    : Math.min(
        90,
        [form.headline, form.summary, form.skills, form.phone, form.resumeUrl || form.linkedinUrl, form.cgpa]
          .filter(Boolean).length * 15
      );

  if (loading) {
    return (
      <DashboardShell role="STUDENT">
        <div className="py-20 text-center text-[#6b6560]">Loading placement portal…</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#e5e0d6] bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-[#12151c] to-[#1c2433] px-5 py-4 sm:px-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-medium tracking-tight">
                  Placement Desk
                </h1>
                <p className="text-sm text-[#b8b2a6] mt-0.5">
                  Search jobs · Build profile · Track applications
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-[#9a948a]">Profile strength</p>
                  <p className="text-sm font-semibold text-[#f0a070]">{profilePct}%</p>
                </div>
                <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#c45c26]" style={{ width: `${profilePct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-[#faf8f4] border-b border-[#ebe6dc]">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a948a]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by skills, designation, companies"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#e5e0d6] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c45c26]/25 focus:border-[#c45c26]/50"
                />
              </div>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#e5e0d6] bg-white text-sm sm:w-44"
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                className="sm:hidden inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#e5e0d6] bg-white text-sm"
                onClick={() => setMobileFilters(true)}
              >
                <Filter className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>

          <div className="flex gap-0 border-b border-[#ebe6dc] px-2 overflow-x-auto">
            {(
              [
                { id: "jobs" as const, label: `Jobs (${filtered.length})` },
                { id: "applications" as const, label: `Applied (${myApps.length})${myApps.some((a) => a.status === "INTERVIEW") ? " · interview" : ""}` },
                { id: "profile" as const, label: "My profile" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "border-[#c45c26] text-[#c45c26]"
                    : "border-transparent text-[#6b6560] hover:text-[#1a1814]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {!profileComplete && tab !== "profile" && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <User className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Complete your placement profile to apply for jobs.{" "}
              <button className="font-semibold underline" onClick={() => setTab("profile")}>
                Update profile
              </button>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <aside className="hidden lg:block lg:col-span-3">
              <div className="rounded-2xl border border-[#e5e0d6] bg-white p-4 sticky top-24 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1a1814]">All filters</p>
                  <button
                    className="text-xs text-[#c45c26]"
                    onClick={() => {
                      setLocationFilter("");
                      setTypeFilter("");
                      setPackageFilter("");
                      setSearch("");
                    }}
                  >
                    Clear
                  </button>
                </div>
                <FilterGroup title="Job type">
                  {["Full-time", "Internship", "Contract"].map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm text-[#3d3a35] cursor-pointer">
                      <input
                        type="radio"
                        name="jobType"
                        checked={typeFilter === t}
                        onChange={() => setTypeFilter(typeFilter === t ? "" : t)}
                        className="accent-[#c45c26]"
                      />
                      {t}
                    </label>
                  ))}
                </FilterGroup>
                <FilterGroup title="Package (LPA)">
                  {[
                    { v: "0-5", l: "0 – 5 LPA" },
                    { v: "5-10", l: "5 – 10 LPA" },
                    { v: "10+", l: "10+ LPA" },
                  ].map((p) => (
                    <label key={p.v} className="flex items-center gap-2 text-sm text-[#3d3a35] cursor-pointer">
                      <input
                        type="radio"
                        name="pkg"
                        checked={packageFilter === p.v}
                        onChange={() => setPackageFilter(packageFilter === p.v ? "" : p.v)}
                        className="accent-[#c45c26]"
                      />
                      {p.l}
                    </label>
                  ))}
                </FilterGroup>
                {locations.length > 0 && (
                  <FilterGroup title="Location">
                    {locations.map((l) => (
                      <label key={l} className="flex items-center gap-2 text-sm text-[#3d3a35] cursor-pointer">
                        <input
                          type="radio"
                          name="loc"
                          checked={locationFilter === l}
                          onChange={() => setLocationFilter(locationFilter === l ? "" : l)}
                          className="accent-[#c45c26]"
                        />
                        {l}
                      </label>
                    ))}
                  </FilterGroup>
                )}
              </div>
            </aside>

            <div className="lg:col-span-9 grid grid-cols-1 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-2 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                <p className="text-xs text-[#6b6560] px-1">
                  {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
                </p>
                {filtered.map((j) => {
                  const active = selectedJob?.job?.id === j.id;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => openJob(j.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition-all ${
                        active
                          ? "border-[#c45c26] bg-[#fff8f3] shadow-md"
                          : "border-[#e5e0d6] bg-white hover:border-[#d4cfc4] hover:shadow-sm"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="h-11 w-11 rounded-xl bg-[#f3f0e9] border border-[#e5e0d6] flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-[#c45c26]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1a1814] text-[15px] leading-snug truncate">{j.title}</p>
                          <p className="text-sm text-[#6b6560] mt-0.5 truncate">{j.companyName}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[#6b6560]">
                            {j.location && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                            )}
                            {j.packageLpa != null && (
                              <span className="inline-flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {j.packageLpa} LPA</span>
                            )}
                            {j.jobType && (
                              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {j.jobType}</span>
                            )}
                          </div>
                          {j.skillsRequired && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {j.skillsRequired.split(",").slice(0, 3).map((s: string) => (
                                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f0e9] text-[#5a554e] border border-[#e5e0d6]">
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[11px] text-[#9a948a] inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {j.createdAt
                                ? new Date(j.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                : ""}
                            </span>
                            {j.myStatus && <span className="text-[11px] font-semibold text-[#1a6b5c]">{j.myStatus}</span>}
                            {j.blocked && <span className="text-[11px] font-semibold text-red-600">Restricted</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#d4cec3] bg-white py-16 text-center text-[#6b6560] text-sm">
                    No jobs match your filters
                  </div>
                )}
              </div>

              <div className="xl:col-span-3">
                <div className="rounded-2xl border border-[#e5e0d6] bg-white min-h-[420px] sticky top-24">
                  {!selectedJob && !detailLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 text-[#6b6560]">
                      <Briefcase className="h-10 w-10 text-[#d4cec3] mb-3" />
                      <p className="font-medium text-[#1a1814]">Select a job to view details</p>
                      <p className="text-sm mt-1">Click any listing on the left to open the full description</p>
                    </div>
                  )}
                  {detailLoading && <div className="p-10 text-center text-sm text-[#6b6560]">Loading job…</div>}
                  {selectedJob?.job && (
                    <div className="p-5 sm:p-6 space-y-5">
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-[#f3f0e9] border border-[#e5e0d6] flex items-center justify-center shrink-0">
                          <Building2 className="h-7 w-7 text-[#c45c26]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-xl font-medium text-[#1a1814] leading-snug">{selectedJob.job.title}</h2>
                          <p className="text-[#6b6560] mt-0.5">{selectedJob.job.companyName}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#5a554e]">
                            {selectedJob.job.location && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {selectedJob.job.location}</span>
                            )}
                            {selectedJob.job.packageLpa != null && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <IndianRupee className="h-3.5 w-3.5" /> {selectedJob.job.packageLpa} LPA
                              </span>
                            )}
                            {selectedJob.job.jobType && <span>{selectedJob.job.jobType}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {selectedJob.blocked ? (
                          <span className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-medium">Restricted by college</span>
                        ) : selectedJob.myApplication ? (
                          <div className="space-y-2 w-full">
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e2f0ed] text-[#1a6b5c] text-sm font-semibold">
                              <CheckCircle2 className="h-4 w-4" /> {selectedJob.myApplication.status}
                            </span>
                            {selectedJob.myApplication.status === "INTERVIEW" && (
                              <div className="rounded-xl border border-[#f0dcc8] bg-[#fff8f3] p-3 text-sm text-[#5a3d28]">
                                <p className="font-semibold text-[#c45c26] text-xs uppercase tracking-wider mb-1">Interview scheduled</p>
                                {selectedJob.myApplication.interviewRound && (
                                  <p>Round: {selectedJob.myApplication.interviewRound}</p>
                                )}
                                {selectedJob.myApplication.interviewAt && (
                                  <p>
                                    {new Date(selectedJob.myApplication.interviewAt).toLocaleString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                      weekday: "short",
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}{" "}
                                    IST
                                  </p>
                                )}
                                {selectedJob.myApplication.interviewInfo && (
                                  <p className="mt-1 whitespace-pre-wrap">{selectedJob.myApplication.interviewInfo}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!profileComplete}
                            onClick={() => openApplyModal(selectedJob.job)}
                            className="sy-btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                          >
                            {!profileComplete ? "Complete profile to apply" : "Apply now"}
                          </button>
                        )}
                      </div>

                      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{msg}</p>}

                      {selectedJob.job.description && (
                        <Section title="Job description">
                          <p className="text-sm text-[#3d3a35] whitespace-pre-wrap leading-relaxed">{selectedJob.job.description}</p>
                        </Section>
                      )}
                      {selectedJob.job.requirements && (
                        <Section title="Requirements">
                          <p className="text-sm text-[#3d3a35] whitespace-pre-wrap leading-relaxed">{selectedJob.job.requirements}</p>
                        </Section>
                      )}
                      {selectedJob.job.skillsRequired && (
                        <Section title="Key skills">
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.job.skillsRequired.split(",").map((s: string) => (
                              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-[#f3f0e9] border border-[#e5e0d6]">{s.trim()}</span>
                            ))}
                          </div>
                        </Section>
                      )}
                      <Section title="Eligibility">
                        <ul className="text-sm text-[#3d3a35] space-y-1">
                          {selectedJob.job.minCgpa != null && <li>Min CGPA: {selectedJob.job.minCgpa}</li>}
                          {selectedJob.job.maxBacklogs != null && <li>Max backlogs: {selectedJob.job.maxBacklogs}</li>}
                          {selectedJob.job.eligibleYears && <li>Years: {selectedJob.job.eligibleYears}</li>}
                          {selectedJob.job.eligibleDepts && <li>Departments: {selectedJob.job.eligibleDepts}</li>}
                          {!selectedJob.job.minCgpa && !selectedJob.job.eligibleYears && !selectedJob.job.eligibleDepts && (
                            <li className="text-[#9a948a]">Open eligibility</li>
                          )}
                        </ul>
                      </Section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "applications" && (
          <div className="space-y-4">
            {/* Live updates / notifications */}
            {myApps.filter((a) => a.status !== "APPLIED").length > 0 && (
              <div className="rounded-2xl border border-[#e5e0d6] bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-[#ebe6dc] bg-[#faf8f4] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#c45c26] animate-pulse" />
                  <p className="text-sm font-semibold text-[#1a1814]">Status updates</p>
                </div>
                <div className="divide-y divide-[#f0ebe3]">
                  {myApps
                    .filter((a) => a.status !== "APPLIED")
                    .sort((a, b) => new Date(b.updatedAt || b.appliedAt).getTime() - new Date(a.updatedAt || a.appliedAt).getTime())
                    .map((a) => (
                      <div key={`n-${a.id}`} className="px-4 py-3 flex gap-3 text-sm">
                        <div className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-[#c45c26]" />
                        <div className="min-w-0">
                          <p className="text-[#1a1814]">
                            <span className="font-semibold">{a.job?.title}</span>
                            {" · "}
                            <span className="text-[#6b6560]">{a.job?.companyName}</span>
                            {" — "}
                            <StatusPill status={a.status} />
                          </p>
                          {a.status === "INTERVIEW" && (
                            <div className="mt-2 rounded-xl bg-[#fff8f3] border border-[#f0dcc8] px-3 py-2 text-xs text-[#5a3d28] space-y-1">
                              <p className="font-semibold text-[#c45c26]">
                                Interview scheduled{a.interviewRound ? ` · ${a.interviewRound}` : ""}
                              </p>
                              {a.interviewAt && (
                                <p>
                                  When:{" "}
                                  {new Date(a.interviewAt).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  (IST)
                                </p>
                              )}
                              {a.interviewInfo && <p className="whitespace-pre-wrap">{a.interviewInfo}</p>}
                            </div>
                          )}
                          {a.status === "SHORTLISTED" && (
                            <p className="text-xs text-violet-700 mt-1">You have been shortlisted. Watch this space for interview details.</p>
                          )}
                          {a.status === "SELECTED" && (
                            <p className="text-xs text-emerald-700 mt-1">Congratulations — marked as selected / placed.</p>
                          )}
                          {a.status === "REJECTED" && (
                            <p className="text-xs text-red-600 mt-1">This application was not moved forward.</p>
                          )}
                          <p className="text-[11px] text-[#9a948a] mt-1">
                            Updated{" "}
                            {new Date(a.updatedAt || a.appliedAt).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#e5e0d6] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[#ebe6dc] bg-[#faf8f4]">
                <p className="text-sm font-semibold text-[#1a1814]">All applications</p>
              </div>
              {myApps.length === 0 ? (
                <div className="py-16 text-center text-[#6b6560] text-sm">
                  You haven&apos;t applied to any jobs yet.{" "}
                  <button className="text-[#c45c26] font-medium" onClick={() => setTab("jobs")}>
                    Browse jobs
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#ebe6dc]">
                  {myApps.map((a) => (
                    <div key={a.id} className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-[#f3f0e9] flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-[#c45c26]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 justify-between">
                            <div>
                              <p className="font-semibold text-[#1a1814]">{a.job?.title}</p>
                              <p className="text-sm text-[#6b6560]">{a.job?.companyName}</p>
                            </div>
                            <StatusPill status={a.status} />
                          </div>

                          {a.status === "INTERVIEW" && (
                            <div className="mt-3 rounded-xl border border-[#f0dcc8] bg-[#fff8f3] p-3 space-y-1.5">
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#c45c26]">
                                Interview details
                              </p>
                              {a.interviewRound && (
                                <p className="text-sm text-[#1a1814]">
                                  <span className="text-[#6b6560]">Round:</span> {a.interviewRound}
                                </p>
                              )}
                              {a.interviewAt && (
                                <p className="text-sm text-[#1a1814]">
                                  <span className="text-[#6b6560]">Schedule:</span>{" "}
                                  {new Date(a.interviewAt).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  IST
                                </p>
                              )}
                              {a.interviewInfo && (
                                <p className="text-sm text-[#3d3a35] whitespace-pre-wrap mt-1">{a.interviewInfo}</p>
                              )}
                              {!a.interviewAt && !a.interviewInfo && (
                                <p className="text-sm text-[#6b6560]">Interview marked — details will appear when admin shares them.</p>
                              )}
                            </div>
                          )}

                          {a.status === "SHORTLISTED" && (
                            <p className="mt-2 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                              Shortlisted for further rounds. You will see interview schedule here when shared.
                            </p>
                          )}
                          {a.status === "SELECTED" && (
                            <p className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                              Selected / placed for this role.
                            </p>
                          )}
                          {a.status === "REJECTED" && (
                            <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              Not selected for this opening.
                            </p>
                          )}
                          {a.adminNotes && a.status !== "REJECTED" && (
                            <p className="mt-2 text-xs text-[#6b6560]">Note: {a.adminNotes}</p>
                          )}

                          <div className="flex items-center gap-3 mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setTab("jobs");
                                openJob(a.job?.id);
                              }}
                              className="text-xs text-[#c45c26] inline-flex items-center gap-0.5 font-medium"
                            >
                              View job <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] text-[#9a948a]">
                              Applied{" "}
                              {new Date(a.appliedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "profile" && (
          <form onSubmit={saveProfile} className="rounded-2xl border border-[#e5e0d6] bg-white p-5 sm:p-6 space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 pb-2 border-b border-[#ebe6dc]">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#c45c26] to-[#8a3d14] text-white flex items-center justify-center font-semibold text-lg">
                {(profileData?.profile?.student?.name || "S").charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-[#1a1814]">{profileData?.profile?.student?.name || "Your profile"}</p>
                <p className="text-xs text-[#6b6560]">LinkedIn-style placement profile · {profilePct}% complete</p>
              </div>
            </div>
            <input placeholder="Headline (e.g. Final-year CSE · Full-stack developer)" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="sy-input" />
            <textarea rows={3} placeholder="About / summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="sy-input" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="sy-input" />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="sy-input" />
              <input placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} className="sy-input" />
              <input placeholder="GitHub URL" value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} className="sy-input" />
              <input placeholder="Portfolio URL" value={form.portfolioUrl} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} className="sy-input" />
              <input placeholder="Resume URL (Drive / PDF)" value={form.resumeUrl} onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })} className="sy-input" />
              <input placeholder="CGPA" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} className="sy-input" />
              <input placeholder="Backlogs" value={form.backlogs} onChange={(e) => setForm({ ...form, backlogs: e.target.value })} className="sy-input" />
            </div>
            <input placeholder="Skills (comma separated: Java, React, SQL…)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className="sy-input" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {msg && <p className="text-sm text-emerald-600">{msg}</p>}
            <button type="submit" disabled={saving} className="sy-btn-primary px-5 py-2.5 text-sm">{saving ? "Saving…" : "Save profile"}</button>
          </form>
        )}
      </div>

      
      {showApplyModal && applyJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#12151c]/50 backdrop-blur-[2px]" onClick={() => setShowApplyModal(false)} />
          <div className="relative bg-[#faf8f4] border border-[#e5e0d6] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-[#ebe6dc] flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#9a948a] font-semibold">Apply for</p>
                <h3 className="font-display text-lg font-medium text-[#1a1814]">{applyJob.title}</h3>
                <p className="text-sm text-[#6b6560]">{applyJob.companyName}</p>
              </div>
              <button type="button" onClick={() => setShowApplyModal(false)} className="p-1.5 rounded-lg hover:bg-[#efeae2]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#6b6560] bg-[#f3f0e9] rounded-xl px-3 py-2 border border-[#e5e0d6]">
                Changes here apply <strong>only to this application</strong>. Your saved placement profile stays unchanged.
              </p>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">Headline for this application</label>
                <input
                  value={appForm.appHeadline}
                  onChange={(e) => setAppForm({ ...appForm, appHeadline: e.target.value })}
                  className="sy-input mt-1"
                  placeholder="e.g. Full-stack intern · React & Node"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">Skills for this job</label>
                <textarea
                  rows={2}
                  value={appForm.appSkills}
                  onChange={(e) => setAppForm({ ...appForm, appSkills: e.target.value })}
                  className="sy-input mt-1"
                  placeholder="Comma-separated skills matching this role"
                />
                {applyJob.skillsRequired && (
                  <p className="text-[11px] text-[#9a948a] mt-1">Job asks for: {applyJob.skillsRequired}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">Resume for this application</label>
                <div className="mt-1 rounded-xl border border-dashed border-[#d4cec3] bg-white p-4">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf"
                    onChange={(e) => onResumeFile(e.target.files?.[0] || null)}
                    className="text-sm w-full"
                  />
                  <p className="text-[11px] text-[#9a948a] mt-2">PDF / DOC / DOCX · max 2.5 MB</p>
                  {appForm.resumeFileName && (
                    <p className="text-xs text-[#1a6b5c] mt-1 font-medium">Selected: {appForm.resumeFileName}</p>
                  )}
                  <div className="mt-2">
                    <p className="text-[11px] text-[#6b6560] mb-1">Or paste resume link</p>
                    <input
                      value={appForm.appResume.startsWith("data:") ? "" : appForm.appResume}
                      onChange={(e) =>
                        setAppForm({
                          ...appForm,
                          appResume: e.target.value,
                          resumeFileName: e.target.value ? "External link" : appForm.resumeFileName,
                        })
                      }
                      placeholder="https://drive.google.com/..."
                      className="sy-input text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6560]">Cover note (optional)</label>
                <textarea
                  rows={3}
                  value={appForm.coverLetter}
                  onChange={(e) => setAppForm({ ...appForm, coverLetter: e.target.value })}
                  className="sy-input mt-1"
                  placeholder="Why you are a fit for this role…"
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 py-2.5 text-sm rounded-xl border border-[#e5e0d6] hover:bg-[#f3f0e9]">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving || !appForm.appSkills.trim()}
                  onClick={submitApplication}
                  className="flex-1 sy-btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  {saving ? "Submitting…" : "Submit application"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Filters</p>
              <button onClick={() => setMobileFilters(false)}><X className="h-5 w-5" /></button>
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sy-input">
              <option value="">All job types</option>
              <option>Full-time</option>
              <option>Internship</option>
              <option>Contract</option>
            </select>
            <select value={packageFilter} onChange={(e) => setPackageFilter(e.target.value)} className="w-full sy-input">
              <option value="">Any package</option>
              <option value="0-5">0 – 5 LPA</option>
              <option value="5-10">5 – 10 LPA</option>
              <option value="10+">10+ LPA</option>
            </select>
            <button className="sy-btn-primary w-full py-2.5 text-sm" onClick={() => setMobileFilters(false)}>Show results</button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9a948a] mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9a948a] mb-2">{title}</h3>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPLIED: "bg-sky-50 text-sky-800",
    SHORTLISTED: "bg-violet-50 text-violet-800",
    INTERVIEW: "bg-amber-50 text-amber-900",
    SELECTED: "bg-emerald-50 text-emerald-800",
    REJECTED: "bg-red-50 text-red-700",
    BLOCKED: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || "bg-slate-100"}`}>
      {status}
    </span>
  );
}
