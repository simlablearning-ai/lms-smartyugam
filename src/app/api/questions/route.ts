import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const questionBankId = searchParams.get("questionBankId");

  const where: any = { isActive: true };

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (collegeId) {
    where.collegeId = collegeId;
  }
  if (departmentId) where.departmentId = departmentId;
  if (questionBankId) where.questionBankId = questionBankId;

  const questions = await prisma.question.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      questionBank: { select: { id: true, name: true } },
    },
  });

  return json(questions);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let {
      text,
      type,
      options,
      correctAnswer,
      explanation,
      difficulty,
      marks,
      collegeId,
      departmentId,
      questionBankId,
    } = body;

    if (!text || !correctAnswer) {
      return error("Question text and correct answer are required");
    }

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    const question = await prisma.question.create({
      data: {
        text,
        type: type || "MCQ",
        options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
        correctAnswer,
        explanation: explanation || null,
        difficulty: difficulty ? parseInt(difficulty) : 1,
        marks: marks ? parseInt(marks) : 1,
        collegeId: collegeId || null,
        departmentId: departmentId || null,
        questionBankId: questionBankId || null,
        createdById: auth.session!.user.id,
      },
    });

    return json(question, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create question", 500);
  }
}
