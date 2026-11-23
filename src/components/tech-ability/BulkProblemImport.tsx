"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Upload, Download } from "lucide-react";

const SAMPLE = `[{
  "title": "Sum of Two Numbers",
  "description": "Read two integers and print their sum.\\n\\nInput:\\n- Line 1: A\\n- Line 2: B\\n\\nOutput: A + B",
  "language": "JAVA",
  "marks": 10,
  "difficulty": 1,
  "starterCode": "import java.util.Scanner;\\n\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        // TODO\\n        sc.close();\\n    }\\n}\\n",
  "testCases": [
    { "input": "3\\n5\\n", "expectedOutput": "8\\n", "isHidden": false },
    { "input": "10\\n-4\\n", "expectedOutput": "6\\n", "isHidden": true }
  ]
},
{
  "title": "Hello World",
  "description": "Print Hello World",
  "language": "PYTHON",
  "marks": 5,
  "difficulty": 1,
  "starterCode": "# print Hello World\\n",
  "testCases": [
    { "input": "", "expectedOutput": "Hello World\\n", "isHidden": false }
  ]
}]`;

export function BulkProblemImportButton({
  onDone,
}: {
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<string>("");

  function openModal() {
    setError("");
    setResult("");
    setText("");
    setOpen(true);
  }

  async function loadTemplate() {
    try {
      const res = await fetch("/templates/tech-ability-problems-template.json");
      if (res.ok) {
        const data = await res.json();
        setText(JSON.stringify(data, null, 2));
        setError("");
        return;
      }
    } catch {
      /* fallback */
    }
    setText(SAMPLE);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ""));
      setError("");
      setResult("");
    };
    reader.readAsText(file);
  }

  async function submit() {
    setSaving(true);
    setError("");
    setResult("");
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError("Invalid JSON. Fix the file/text and try again.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/tech-ability/problems/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        setSaving(false);
        return;
      }
      setResult(
        `Created ${data.created} problem(s)` +
          (data.skipped ? `, skipped ${data.skipped}` : "") +
          (data.errors?.length
            ? `. Errors: ${data.errors.map((e: any) => `#${e.index}: ${e.error}`).join("; ")}`
            : ".")
      );
      onDone?.();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg"
      >
        <Upload className="h-4 w-4" /> Bulk import
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Bulk import coding problems" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Paste a JSON <strong>array</strong> of problems, or upload a <code className="text-xs bg-slate-100 px-1 rounded">.json</code> file.
            Max 100 problems per import.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTemplate}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" /> Load sample template
            </button>
            <a
              href="/templates/tech-ability-problems-template.json"
              download="tech-ability-problems-template.json"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              Download template file
            </a>
            <label className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> Upload JSON
              <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
            </label>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            spellCheck={false}
            placeholder='[{ "title": "...", "description": "...", "language": "JAVA", "marks": 10, "testCases": [...] }]'
            className="w-full font-mono text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}
          {result && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{result}</div>
          )}

          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">Required fields per problem:</p>
            <p>
              <code>title</code>, <code>description</code> · optional:{" "}
              <code>language</code> (PYTHON|JAVA|JAVASCRIPT|CPP|C), <code>marks</code>,{" "}
              <code>difficulty</code>, <code>starterCode</code>, <code>testCases</code>
            </p>
            <p>
              Each test case: <code>{"{"}"input","expectedOutput","isHidden"{'}'}</code>
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300"
            >
              Close
            </button>
            <button
              type="button"
              disabled={saving || !text.trim()}
              onClick={submit}
              className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white disabled:opacity-50"
            >
              {saving ? "Importing..." : "Import problems"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
