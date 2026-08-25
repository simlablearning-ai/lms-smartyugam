"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Modal } from "@/components/ui/Modal";
import { useListPagination, ListPaginationBar } from "@/components/ui/ListPagination";
import { Building2, Plus, MapPin, Users, Pencil, Trash2, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

type College = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; departments: number; courses: number };
  users?: { id: string; name: string; email: string }[];
};

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdAdmin, setCreatedAdmin] = useState<{ email: string; password: string } | null>(null);

  async function loadColleges() {
    setLoading(true);
    try {
      const res = await fetch("/api/colleges");
      const data = await res.json();
      setColleges(Array.isArray(data) ? data : []);
    } catch {
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadColleges();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setError("");
    setCreatedAdmin(null);
    setModalOpen(true);
  }

  function openEdit(college: College) {
    setEditing(college);
    setForm({
      name: college.name,
      code: college.code,
      address: college.address || "",
      city: college.city || "",
      state: college.state || "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setError("");
    setCreatedAdmin(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setCreatedAdmin(null);

    try {
      const url = editing ? `/api/colleges/${editing.id}` : "/api/colleges";
      const method = editing ? "PUT" : "POST";

      const payload = editing
        ? {
            name: form.name,
            code: form.code,
            address: form.address,
            city: form.city,
            state: form.state,
          }
        : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setSaving(false);
        return;
      }

      if (!editing && data.admin) {
        setCreatedAdmin({
          email: form.adminEmail,
          password: form.adminPassword,
        });
      } else {
        setModalOpen(false);
      }
      loadColleges();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete college "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/colleges/${id}`, { method: "DELETE" });
      if (res.ok) {
        loadColleges();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  }

  const filtered = colleges.filter((c) => {
const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      !statusFilter ||
      (statusFilter === "active" && c.isActive) ||
      (statusFilter === "inactive" && !c.isActive);
    return matchSearch && matchStatus;
  });

  const {
    page,
    setPage,
    viewAll,
    setViewAll,
    pageItems,
    total,
    totalPages,
    from,
    to,
  } = useListPagination(filtered, 20);

return (
    <DashboardShell role="SUPER_ADMIN">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Colleges</h1>
            <p className="text-slate-500 mt-1">
              Manage all colleges on the platform
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add College
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search colleges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 pt-3 pb-1 border-b border-slate-100">
            <ListPaginationBar
              page={page}
              setPage={setPage}
              viewAll={viewAll}
              setViewAll={setViewAll}
              total={total}
              totalPages={totalPages}
              from={from}
              to={to}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">College</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Code</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Location</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Depts</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Users</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Created</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No colleges found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((college) => (
                    <tr key={college.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-slate-900">{college.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">{college.code}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {college.city || "—"}
                          {college.state ? `, ${college.state}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{college._count.departments}</td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {college._count.users}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            college.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {college.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(college.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(college)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(college.id, college.name)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit College" : "Add College"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              College Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. SmartYugam Institute of Technology"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Code *
            </label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              placeholder="e.g. SYIT"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {!editing && (
            <div className="border border-indigo-100 bg-indigo-50/50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-indigo-900">College Admin login</p>
                <p className="text-xs text-indigo-700/80 mt-0.5">
                  Creates a COLLEGE_ADMIN account mapped to this college. They can log in at the same portal URL.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin name *</label>
                <input
                  required
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Placement Officer / Dean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin email (login) *</label>
                <input
                  required
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="admin@college.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin password *</label>
                <input
                  required
                  type="text"
                  minLength={6}
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
          )}

          {createdAdmin && (
            <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-3 py-3 space-y-1">
              <p className="font-semibold">College &amp; admin created</p>
              <p>
                Login email: <code className="bg-white px-1 rounded border">{createdAdmin.email}</code>
              </p>
              <p>
                Password: <code className="bg-white px-1 rounded border">{createdAdmin.password}</code>
              </p>
              <p className="text-xs text-emerald-700">Share these with the college admin, then close.</p>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setCreatedAdmin(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {createdAdmin ? "Close" : "Cancel"}
            </button>
            {!createdAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create college & admin"}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
