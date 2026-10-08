import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, QuestionType } from "@prisma/client";
import { parseDocxQuestions } from "@/lib/parse-docx-questions";

/**
 * POST /api/questions/bulk-word
 * multipart/form-data: file (.docx), questionBankId?, bankName?, collegeId?, departmentId?
 * Additive — does not change CSV/Excel /api/questions/bulk.
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const form = await req.formData();
    const file = form.get("file");
    let questionBankId = (form.get("questionBankId") as string) || "";
    const bankName = ((form.get("bankName") as string) || "").trim();
    let collegeId = (form.get("collegeId") as string) || "";
    const departmentId = (form.get("departmentId") as string) || "";

    if (!file || !(file instanceof Blob)) return error("Word file (.docx) is required");
    const name = (file as File).name || "";
    if (!name.toLowerCase().endsWith(".docx")) return error("Only .docx Word files are supported");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId || "";
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.byteLength > 15 * 1024 * 1024) return error("File too large (max 15 MB)");

    const parsed = await parseDocxQuestions(buf);
    if (!parsed.questions.length) {
      return error(
        "No questions found in Word file. Use: Q1: text … A) … Answer: B" +
          (parsed.errors.length ? ` — ${parsed.errors[0]}` : "")
      );
    }

    let bankId = questionBankId || null;
    if (!bankId) {
      if (!bankName) return error("Provide questionBankId or bankName");
      const bank = await prisma.questionBank.create({
        data: {
          name: bankName,
          description: "Imported from Word (image questions)",
          collegeId: collegeId || null,
          createdById: auth.session!.user.id,
        },
      });
      bankId = bank.id;
    } else {
      const existing = await prisma.questionBank.findUnique({ where: { id: bankId } });
      if (!existing) return error("Question bank not found", 404);
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      questionBankId: bankId,
      imagesFound: parsed.imageCount,
      parseWarnings: parsed.errors,
    };

    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      if (!q.text || !q.correctAnswer) {
        results.skipped++;
        results.errors.push(`Q${i + 1}: missing text or answer`);
        continue;
      }
      let type: QuestionType = QuestionType.MCQ;
      if (q.type === "TRUE_FALSE") type = QuestionType.TRUE_FALSE;
      if (q.type === "SHORT_ANSWER") type = QuestionType.SHORT_ANSWER;

      try {
        await prisma.question.create({
          data: {
            text: q.text,
            type,
            options: q.options.length ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty || 1,
            marks: q.marks || 1,
            collegeId: collegeId || null,
            departmentId: departmentId || null,
            questionBankId: bankId,
            createdById: auth.session!.user.id,
            imageUrl: q.imageUrl || null,
            optionImages: q.optionImages?.length ? JSON.stringify(q.optionImages) : null,
          } as any,
        });
        results.created++;
      } catch (e: any) {
        if (String(e.message || "").includes("imageUrl") || String(e.message || "").includes("Unknown arg")) {
          try {
            await prisma.question.create({
              data: {
                text: q.text,
                type,
                options: q.options.length ? JSON.stringify(q.options) : null,
                correctAnswer: q.correctAnswer,
                difficulty: q.difficulty || 1,
                marks: q.marks || 1,
                collegeId: collegeId || null,
                departmentId: departmentId || null,
                questionBankId: bankId,
                createdById: auth.session!.user.id,
              },
            });
            results.created++;
            results.errors.push(`Q${i + 1}: saved without image (run prisma db push for imageUrl)`);
          } catch (e2: any) {
            results.skipped++;
            results.errors.push(`Q${i + 1}: ${e2.message}`);
          }
        } else {
          results.skipped++;
          results.errors.push(`Q${i + 1}: ${e.message}`);
        }
      }
    }

    return json(results, 201);
  } catch (e: any) {
    console.error("bulk-word error:", e);
    return error(e.message || "Word bulk upload failed", 500);
  }
}
