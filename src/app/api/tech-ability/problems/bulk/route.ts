import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, TechLanguage } from "@prisma/client";
import { resolveCreatorId } from "@/lib/session-user";

const ALLOWED_LANGS = new Set(["PYTHON", "JAVA", "JAVASCRIPT", "CPP", "C"]);

type IncomingProblem = {
  title?: string;
  description?: string;
  language?: string;
  starterCode?: string | null;
  solutionCode?: string | null;
  testCases?: unknown;
  marks?: number | string;
  difficulty?: number | string;
  collegeId?: string | null;
};

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const createdById = await resolveCreatorId(auth.session);
    if (!createdById) {
      return error("Session outdated. Sign out and sign in again.", 401);
    }

    const body = await req.json();
    const items: IncomingProblem[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.problems)
        ? body.problems
        : [];

    if (!items.length) {
      return error("Provide a non-empty array of problems (or { problems: [...] })");
    }
    if (items.length > 100) {
      return error("Max 100 problems per bulk import");
    }

    let defaultCollegeId: string | null =
      auth.session!.user.role === Role.COLLEGE_ADMIN
        ? (auth.session!.user.collegeId as string) || null
        : null;

    if (auth.session!.user.role === Role.SUPER_ADMIN && body?.collegeId) {
      defaultCollegeId = body.collegeId;
    }

    const errors: { index: number; error: string }[] = [];
    const toCreate: {
      title: string;
      description: string;
      language: TechLanguage;
      starterCode: string | null;
      solutionCode: string | null;
      testCases: string;
      marks: number;
      difficulty: number;
      collegeId: string | null;
      createdById: string;
    }[] = [];

    items.forEach((raw, index) => {
      const title = String(raw?.title || "").trim();
      const description = String(raw?.description || "").trim();
      if (!title) {
        errors.push({ index, error: "title is required" });
        return;
      }
      if (!description) {
        errors.push({ index, error: "description is required" });
        return;
      }

      const lang = String(raw?.language || "PYTHON").toUpperCase().trim();
      if (!ALLOWED_LANGS.has(lang)) {
        errors.push({
          index,
          error: `language must be one of ${[...ALLOWED_LANGS].join(", ")}`,
        });
        return;
      }

      let casesStr = "[]";
      if (typeof raw.testCases === "string") {
        try {
          const parsed = JSON.parse(raw.testCases);
          if (!Array.isArray(parsed)) {
            errors.push({ index, error: "testCases string must be a JSON array" });
            return;
          }
          casesStr = JSON.stringify(parsed);
        } catch {
          errors.push({ index, error: "testCases is not valid JSON" });
          return;
        }
      } else if (Array.isArray(raw.testCases)) {
        casesStr = JSON.stringify(raw.testCases);
      } else if (raw.testCases != null) {
        errors.push({ index, error: "testCases must be an array or JSON string" });
        return;
      }

      const marks = raw.marks != null ? parseInt(String(raw.marks), 10) : 10;
      const difficulty =
        raw.difficulty != null ? parseInt(String(raw.difficulty), 10) : 1;

      if (Number.isNaN(marks) || marks < 1) {
        errors.push({ index, error: "marks must be a positive number" });
        return;
      }

      let collegeId =
        auth.session!.user.role === Role.COLLEGE_ADMIN
          ? defaultCollegeId
          : raw.collegeId != null
            ? String(raw.collegeId) || null
            : defaultCollegeId;

      toCreate.push({
        title,
        description,
        language: lang as TechLanguage,
        starterCode: raw.starterCode != null ? String(raw.starterCode) : null,
        solutionCode: raw.solutionCode != null ? String(raw.solutionCode) : null,
        testCases: casesStr,
        marks,
        difficulty: Number.isNaN(difficulty) ? 1 : difficulty,
        collegeId,
        createdById,
      });
    });

    if (!toCreate.length) {
      return error("No valid problems to import", 400);
    }

    const created = await prisma.$transaction(
      toCreate.map((data) => prisma.techProblem.create({ data }))
    );

    return json(
      {
        created: created.length,
        skipped: errors.length,
        errors,
        problems: created.map((p) => ({
          id: p.id,
          title: p.title,
          language: p.language,
          marks: p.marks,
        })),
      },
      201
    );
  } catch (e: any) {
    return error(e.message || "Bulk import failed", 500);
  }
}
