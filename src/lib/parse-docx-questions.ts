/**
 * Parse a Word (.docx) buffer into structured MCQ questions.
 * Extracts text blocks (Q1 / Question 1) and embedded images.
 * Safe additive helper — does not touch existing CSV/Excel parsers.
 */

import JSZip from "jszip";

export type ParsedDocxQuestion = {
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  correctAnswer: string;
  difficulty: number;
  marks: number;
  departmentCode?: string;
  imageUrl?: string | null;
  optionImages?: (string | null)[];
};

type MediaMap = Record<string, string>;

function mediaTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

async function extractMedia(zip: JSZip): Promise<{ media: MediaMap; ordered: string[] }> {
  const media: MediaMap = {};
  const ordered: string[] = [];
  const relsFile = zip.file("word/_rels/document.xml.rels");
  const rIdToPath: Record<string, string> = {};
  if (relsFile) {
    const relsXml = await relsFile.async("string");
    const relRe = /Id="(rId\d+)"[^>]*Target="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = relRe.exec(relsXml))) {
      let target = m[2];
      if (target.startsWith("/")) target = target.slice(1);
      if (!target.startsWith("word/")) target = "word/" + target.replace(/^\.\.\//, "");
      rIdToPath[m[1]] = target;
    }
  }
  for (const [rId, path] of Object.entries(rIdToPath)) {
    const f = zip.file(path);
    if (!f) continue;
    if (!/\.(png|jpe?g|gif|webp)$/i.test(path)) continue;
    const buf = await f.async("base64");
    const dataUrl = `data:${mediaTypeFromPath(path)};base64,${buf}`;
    media[rId] = dataUrl;
    ordered.push(dataUrl);
  }
  if (ordered.length === 0) {
    const files = Object.keys(zip.files).filter((p) => p.startsWith("word/media/"));
    for (const path of files) {
      const f = zip.file(path);
      if (!f || f.dir) continue;
      if (!/\.(png|jpe?g|gif|webp)$/i.test(path)) continue;
      const buf = await f.async("base64");
      ordered.push(`data:${mediaTypeFromPath(path)};base64,${buf}`);
    }
  }
  return { media, ordered };
}

function stripXml(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseTags(line: string) {
  let type: string | undefined;
  let marks: number | undefined;
  let difficulty: number | undefined;
  let department: string | undefined;
  const tagRe = /\[(Type|Marks|Difficulty|Department)\s*:\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(line))) {
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "type") type = val;
    if (key === "marks") marks = parseInt(val, 10);
    if (key === "difficulty") difficulty = parseInt(val, 10);
    if (key === "department") department = val;
  }
  const rest = line.replace(tagRe, "").replace(/←.*$/g, "").replace(/\[IMAGE\]/gi, "").trim();
  return { type, marks, difficulty, department, rest };
}

function normalizeType(raw?: string): "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" {
  if (!raw) return "MCQ";
  const t = raw.toUpperCase().replace(/[-\s]/g, "_");
  if (t.includes("TRUE") || t === "TF") return "TRUE_FALSE";
  if (t.includes("SHORT")) return "SHORT_ANSWER";
  return "MCQ";
}

function splitBlocks(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  const startRe = /^(?:Q(?:uestion)?\s*\d+\s*[:.)]|\d+\s*[.)]\s*(?=Choose|Which|What|Find|How|Select))/i;
  for (const line of lines) {
    if (startRe.test(line.trim()) && current.length > 0) {
      blocks.push(current.join("\n").trim());
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n").trim());
  return blocks.filter((b) => b.length > 10);
}

function parseBlock(block: string, imagePool: string[], imageCursor: { i: number }): ParsedDocxQuestion | null {
  const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const first = lines[0];
  const withoutNum = first.replace(/^(?:Q(?:uestion)?\s*\d+\s*[:.)]\s*|\d+\s*[.)]\s*)/i, "");
  const tags = parseTags(withoutNum);
  const bodyLines: string[] = [];
  if (tags.rest) bodyLines.push(tags.rest);
  const options: string[] = [];
  let correctAnswer = "";
  let inOptions = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const ansMatch = line.match(/^Answer\s*[:\-]\s*(.+)$/i);
    if (ansMatch) {
      correctAnswer = ansMatch[1].trim();
      continue;
    }
    const optMatch = line.match(/^([A-Da-d])[).\:\-]\s*(.+)$/);
    if (optMatch) {
      inOptions = true;
      options.push(optMatch[2].trim());
      continue;
    }
    if (!inOptions) bodyLines.push(line);
  }
  const text = bodyLines.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (correctAnswer && /^[A-Da-d]$/.test(correctAnswer) && options.length) {
    const idx = correctAnswer.toUpperCase().charCodeAt(0) - 65;
    if (options[idx]) correctAnswer = options[idx];
  }
  let imageUrl: string | null = null;
  if (imageCursor.i < imagePool.length) {
    imageUrl = imagePool[imageCursor.i++];
  }
  return {
    text,
    type: normalizeType(tags.type),
    options,
    correctAnswer: correctAnswer || options[0] || "",
    difficulty: Number.isFinite(tags.difficulty) ? (tags.difficulty as number) : 2,
    marks: Number.isFinite(tags.marks) ? (tags.marks as number) : 1,
    departmentCode: tags.department,
    imageUrl,
    optionImages: options.map(() => null),
  };
}

export async function parseDocxQuestions(buffer: ArrayBuffer | Buffer): Promise<{
  questions: ParsedDocxQuestion[];
  imageCount: number;
  errors: string[];
}> {
  const zip = await JSZip.loadAsync(buffer);
  const { ordered } = await extractMedia(zip);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    return { questions: [], imageCount: 0, errors: ["Invalid Word file: missing document.xml"] };
  }
  const xml = await docFile.async("string");
  const text = stripXml(xml);
  const blocks = splitBlocks(text);
  const cursor = { i: 0 };
  const questions: ParsedDocxQuestion[] = [];
  const errors: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    try {
      const q = parseBlock(blocks[i], ordered, cursor);
      if (q && q.text && q.correctAnswer) questions.push(q);
      else if (blocks[i].length > 20) errors.push(`Block ${i + 1}: could not parse question text/answer`);
    } catch (e: any) {
      errors.push(`Block ${i + 1}: ${e.message}`);
    }
  }
  return { questions, imageCount: ordered.length, errors };
}
