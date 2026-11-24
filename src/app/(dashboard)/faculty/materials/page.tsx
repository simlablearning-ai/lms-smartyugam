"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function FacultyMaterialsPage() {
  const sp = useSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState(sp.get("courseId") || "");
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/faculty/me/courses")
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setCourses(arr);
        if (!courseId && arr[0]) setCourseId(arr[0].id);
      });
  }, []);

  useEffect(() => {
    if (!courseId) return;
    fetch(`/api/materials?courseId=${courseId}`)
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []));
  }, [courseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title, fileUrl, fileName: fileUrl }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error || "Failed");
    else {
      setTitle("");
      setFileUrl("");
      setList((l) => [data, ...l]);
      setMsg("Uploaded");
    }
  }

  return (
    <DashboardShell role="FACULTY">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Course materials</h1>
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full max-w-md px-3 py-2 text-sm border rounded-lg">
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <form onSubmit={add} className="grid sm:grid-cols-3 gap-2">
            <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="px-3 py-2 text-sm border rounded-lg" />
            <input placeholder="File URL (Drive/PDF link)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="px-3 py-2 text-sm border rounded-lg" />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg">Add material</button>
          </form>
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
        </div>
        <ul className="bg-white rounded-xl border divide-y">
          {list.map((m) => (
            <li key={m.id} className="px-4 py-3 flex justify-between">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-slate-500">{m.uploadedBy?.name}</p>
              </div>
              {m.fileUrl && (
                <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">Open</a>
              )}
            </li>
          ))}
          {!list.length && <li className="px-4 py-8 text-center text-slate-500">No materials yet</li>}
        </ul>
      </div>
    </DashboardShell>
  );
}
