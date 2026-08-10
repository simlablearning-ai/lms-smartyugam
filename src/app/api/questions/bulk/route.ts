import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role, QuestionType } from "@prisma/client";

/**
 * Bulk upload questions into a Question Bank.
 * Body: {
 *   questionBankId?: string,   // existing bank
 *   bankName?: string,         // create new bank with this name
 *   bankDescription?: string,
 *   collegeId?: string,
 *   departmentId?: string,
 *   questions: [{ text, type?, options?, correctAnswer, explanation?, difficulty?, marks? }]
 * }
 * options can be array or newline/comma separated string.
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let {
      questionBankId,
      bankName,
      bankDescription,
      collegeId,
      departmentId,
      questions,
    } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return error("questions array is required");
    }

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    // Resolve or create question bank
    let bankId = questionBankId;
    if (!bankId) {
      if (!bankName) {
        return error("Provide questionBankId or bankName to create a new bank");
      }
      const bank = await prisma.questionBank.create({
        data: {
          name: bankName,
          description: bankDescription || null,
          collegeId: collegeId || null,
          createdById: auth.session!.user.id,
        },
      });
      bankId = bank.id;
    } else {
      const existing = await prisma.questionBank.findUnique({ where: { id: bankId } });
      if (!existing) return error("Question bank not found", 404);
    }

    const results = { created: 0, skipped: 0, errors: [] as string[], questionBankId: bankId };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const text = (q.text || q.question || q.Question || "").toString().trim();
      const correctAnswer = (q.correctAnswer || q.answer || q.CorrectAnswer || "").toString().trim();
      if (!text || !correctAnswer) {
        results.errors.push(`Row ${i + 1}: text and correctAnswer required`);
        results.skipped++;
        continue;
      }

      let type: QuestionType = "MCQ";
      const typeRaw = (q.type || q.Type || "MCQ").toString().toUpperCase().replace(/[-\s]/g, "_");
      if (typeRaw === "TRUE_FALSE" || typeRaw === "TRUEFALSE" || typeRaw === "TF") type = "TRUE_FALSE";
      else if (typeRaw === "SHORT_ANSWER" || typeRaw === "SHORTANSWER" || typeRaw === "SA") type = "SHORT_ANSWER";
      else type = "MCQ";

      let options: string | null = null;
      if (q.options != null) {
        if (Array.isArray(q.options)) {
          options = JSON.stringify(q.options.map((o: any) => String(o).trim()).filter(Boolean));
        } else {
          const str = String(q.options);
          const arr = str.includes("\n")
            ? str.split("\n")
            : str.includes("|")
            ? str.split("|")
            : str.split(",");
          options = JSON.stringify(arr.map((o) => o.trim()).filter(Boolean));
        }
      }

      const difficulty = q.difficulty != null ? parseInt(String(q.difficulty), 10) : 1;
      const marks = q.marks != null ? parseInt(String(q.marks), 10) : 1;

      try {
        await prisma.question.create({
          data: {
            text,
            type,
            options,
            correctAnswer,
            explanation: q.explanation ? String(q.explanation) : null,
            difficulty: Number.isFinite(difficulty) ? difficulty : 1,
            marks: Number.isFinite(marks) ? marks : 1,
            collegeId: collegeId || null,
            departmentId: departmentId || null,
            questionBankId: bankId,
            createdById: auth.session!.user.id,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1}: ${e.message}`);
        results.skipped++;
      }
    }

    return json(results, 201);
  } catch (e: any) {
    return error(e.message || "Bulk question upload failed", 500);
  }
}
