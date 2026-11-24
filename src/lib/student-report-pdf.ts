/** Build print-ready HTML for one or more student report cards (browser Save as PDF). */

export type StudentReportRow = {
  student: {
    id: string;
    name: string;
    email?: string | null;
    rollNumber?: string | null;
    year?: number | null;
    department?: { name?: string } | null;
    college?: { name?: string } | null;
  };
  attended: Array<{
    testId: string;
    testTitle: string;
    percentage?: number | null;
    status?: string;
    kind?: string;
  }>;
  notAttended: Array<{ testId: string; testTitle: string; kind?: string }>;
  attendedCount: number;
  totalTests: number;
  avgPercentage?: number | null;
};

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardHtml(sr: StudentReportRow) {
  const meta = [
    sr.student.rollNumber || "—",
    sr.student.email || "no email",
    sr.student.department?.name || "No dept",
    sr.student.year != null ? `Year ${sr.student.year}` : null,
    sr.student.college?.name || null,
  ]
    .filter(Boolean)
    .join(" · ");

  const attendedRows =
    sr.attended.length === 0
      ? `<p class="muted">None</p>`
      : `<ul class="list">${sr.attended
          .map((a) => {
            const pct =
              a.percentage != null ? `${Number(a.percentage).toFixed(0)}%` : "—";
            const color =
              a.status === "VIOLATED"
                ? "#b91c1c"
                : (a.percentage || 0) >= 40
                  ? "#059669"
                  : "#dc2626";
            return `<li><span class="title">${esc(a.testTitle)}${
              a.status === "VIOLATED" ? " (violated)" : ""
            }${a.kind === "CODING" ? " · Coding" : ""}</span><span class="pct" style="color:${color}">${pct}</span></li>`;
          })
          .join("")}</ul>`;

  const notRows =
    sr.notAttended.length === 0
      ? `<p class="muted">None</p>`
      : `<ul class="list not">${sr.notAttended
          .map(
            (t) =>
              `<li><span class="title">${esc(t.testTitle)}${
                t.kind === "CODING" ? " · Coding" : ""
              }</span></li>`
          )
          .join("")}</ul>`;

  return `
  <section class="card">
    <div class="head">
      <div>
        <h2>${esc(sr.student.name)}</h2>
        <p class="meta">${esc(meta)}</p>
      </div>
      <div class="stats">
        Attended: <strong>${sr.attendedCount}</strong> / ${sr.totalTests}
        · Avg: <strong>${sr.avgPercentage != null ? sr.avgPercentage : "—"}%</strong>
      </div>
    </div>
    <div class="cols">
      <div>
        <h3 class="ok">Completed exams</h3>
        ${attendedRows}
      </div>
      <div>
        <h3 class="bad">Not attended</h3>
        ${notRows}
      </div>
    </div>
  </section>`;
}

const STYLES = `
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; margin: 24px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #64748b; margin: 0 0 20px; font-size: 12px; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; page-break-inside: avoid; }
  .head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  h2 { font-size: 15px; margin: 0 0 4px; }
  .meta { margin: 0; color: #64748b; font-size: 11px; }
  .stats { font-size: 12px; color: #475569; white-space: nowrap; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  h3 { font-size: 11px; margin: 0 0 8px; text-transform: none; }
  h3.ok { color: #047857; }
  h3.bad { color: #b91c1c; }
  ul.list { list-style: none; margin: 0; padding: 0; }
  ul.list li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px solid #f1f5f9; }
  ul.list.not li { color: #64748b; }
  .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 85%; }
  .pct { font-weight: 600; flex-shrink: 0; }
  .muted { color: #94a3b8; font-size: 12px; margin: 0; }
  @media print {
    body { margin: 12px; }
    .no-print { display: none !important; }
  }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
`;

/** Open a print window for one student (user chooses Save as PDF). */
export function printStudentReport(
  sr: StudentReportRow,
  opts?: { filterLabel?: string }
) {
  printStudentReports([sr], opts);
}

/** Open a print window for many students (one page flow, Save as PDF). */
export function printStudentReports(
  rows: StudentReportRow[],
  opts?: { filterLabel?: string; title?: string }
) {
  const title = opts?.title || "Student-wise exam report";
  const filterLabel = opts?.filterLabel || "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(
    title
  )}</title><style>${STYLES}</style></head><body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="padding:8px 14px;background:#4f46e5;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">Print / Save as PDF</button>
    <button onclick="window.close()" style="margin-left:8px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer">Close</button>
  </div>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(filterLabel)} · Generated ${new Date().toLocaleString()}</p>
  ${rows.map(cardHtml).join("")}
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to download / print the PDF report.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
