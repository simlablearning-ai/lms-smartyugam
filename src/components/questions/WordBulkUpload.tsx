"use client";

/**
 * Word (.docx) bulk upload for image / diagram questions.
 * CSV/Excel bulk upload remains unchanged — this is additive only.
 */

import { useRef, useState } from "react";
import { FileText, Upload, Loader2 } from "lucide-react";

type Props = {
  banks: { id: string; name: string }[];
  collegeId?: string;
  onDone?: () => void;
};

export function WordBulkUpload({ banks, collegeId, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [bankId, setBankId] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleUpload() {
    if (!file) {
      setResult({ error: "Select a .docx Word file" });
      return;
    }
    if (!bankId && !bankName.trim()) {
      setResult({ error: "Select a bank or enter a new bank name" });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (bankId) fd.append("questionBankId", bankId);
      else fd.append("bankName", bankName.trim());
      if (collegeId) fd.append("collegeId", collegeId);

      const res = await fetch("/api/questions/bulk-word", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      setResult(data);
      if (res.ok && data.created > 0) onDone?.();
    } catch (e: any) {
      setResult({ error: e.message || "Upload failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 border border-amber-200 bg-amber-50/50 rounded-xl p-4">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 text-amber-700 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Word upload (image / diagram questions)</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Use for Venn, mirror image, puzzle diagrams. For text-only questions keep using CSV/Excel bulk upload.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Existing bank</label>
          <select
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              if (e.target.value) setBankName("");
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="">— Create new —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Or new bank name</label>
          <input
            value={bankName}
            disabled={!!bankId}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g. Water Mirror Set 1"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
          />
        </div>
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-slate-300 rounded-lg px-3 py-6 text-sm text-slate-600 hover:bg-white"
        >
          {file ? (
            <span className="font-medium text-slate-900">{file.name}</span>
          ) : (
            "Click to choose .docx file"
          )}
        </button>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleUpload}
        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {saving ? "Importing..." : "Import from Word"}
      </button>

      {result && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            result.error
              ? "bg-red-50 border-red-100 text-red-700"
              : "bg-emerald-50 border-emerald-100 text-emerald-800"
          }`}
        >
          {result.error ? (
            result.error
          ) : (
            <>
              Created <strong>{result.created}</strong> question(s)
              {result.skipped ? `, skipped ${result.skipped}` : ""}.
              {result.imagesFound != null && <> Images found in file: {result.imagesFound}.</>}
              {Array.isArray(result.errors) && result.errors.length > 0 && (
                <ul className="mt-1 text-xs list-disc pl-4">
                  {result.errors.slice(0, 5).map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
