/**
 * Client-side CSV / Excel parser.
 * Supports .csv, .xlsx, .xls
 */
import * as XLSX from "xlsx";

export type RowObject = Record<string, string>;

function normalizeKey(k: string): string {
  return String(k || "")
    .trim()
    .replace(/^\uFEFF/, ""); // strip BOM
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  return String(v).trim();
}

/** Parse a File (csv / xlsx / xls) into an array of row objects keyed by header. */
export async function parseSpreadsheetFile(file: File): Promise<RowObject[]> {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
  const isCsv = name.endsWith(".csv") || name.endsWith(".txt");

  if (!isExcel && !isCsv) {
    throw new Error("Unsupported file type. Use .csv, .xlsx, or .xls");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    codepage: 65001,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Spreadsheet has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (!rows.length) return [];

  const headers = (rows[0] as unknown[]).map((h) => normalizeKey(String(h ?? "")));
  if (!headers.some(Boolean)) {
    throw new Error("First row must contain column headers");
  }

  const result: RowObject[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i] as unknown[];
    const obj: RowObject = {};
    let hasValue = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const val = cellToString(cols[idx]);
      obj[h] = val;
      if (val) hasValue = true;
    });
    if (hasValue) result.push(obj);
  }

  return result;
}

/** Simple CSV text parser (fallback / paste). */
export function parseCsvText(text: string): RowObject[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitLine = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = splitLine(lines[0]).map(normalizeKey);
  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    const obj: RowObject = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = (cols[i] || "").replace(/^"|"$/g, "");
    });
    return obj;
  });
}
