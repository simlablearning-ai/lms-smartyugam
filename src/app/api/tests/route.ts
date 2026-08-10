import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");

  const where: any = {};

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (auth.session!.user.role === Role.STUDENT) {
    where.collegeId = auth.session!.user.collegeId;
    where.status = "PUBLISHED";
  } else if (collegeId) {
    where.collegeId = collegeId;
  }

  if (departmentId) where.departmentId = departmentId;

  const tests = await prisma.test.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true, code: true } },
      course: { select: { id: true, title: true } },
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { attempts: true, questions: true } },
    },
  });

  return json(tests);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let {
      title,
      description,
      courseId,
      collegeId,
      departmentId,
      durationMinutes,
      totalMarks,
      passingMarks,
      isProctored,
      status,
      maxAttempts,
      questionIds,
      questionBankId,
      purpose,
      startTime,
      endTime,
    } = body;

    if (!title) return error("Title is required");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    if (!collegeId) return error("College is required");

    // Resolve questions: prefer full Question Bank, else explicit questionIds
    let resolvedIds: string[] = Array.isArray(questionIds) ? questionIds : [];
    if (questionBankId) {
      const bankQuestions = await prisma.question.findMany({
        where: { questionBankId, isActive: true },
        select: { id: true, marks: true },
        orderBy: { createdAt: "asc" },
      });
      if (!bankQuestions.length) {
        return error("Selected Question Bank has no questions. Upload questions first.");
      }
      resolvedIds = bankQuestions.map((q) => q.id);
    }

    if (!resolvedIds.length) {
      return error("Select a Question Bank (or at least one question)");
    }

    // Look up marks for each question
    const qMarks = await prisma.question.findMany({
      where: { id: { in: resolvedIds } },
      select: { id: true, marks: true },
    });
    const marksMap = Object.fromEntries(qMarks.map((q) => [q.id, q.marks]));

    const test = await prisma.test.create({
      data: {
        title,
        description: description || null,
        courseId: courseId || null,
        collegeId,
        departmentId: departmentId || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
        totalMarks: totalMarks ? parseInt(totalMarks) : 100,
        passingMarks: passingMarks ? parseInt(passingMarks) : 40,
        isProctored: isProctored !== false,
        status: status || "DRAFT",
        purpose: purpose || "GENERAL",
        maxAttempts: maxAttempts ? parseInt(maxAttempts) : 1,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        createdById: auth.session!.user.id,
        questions: {
          create: resolvedIds.map((qid, idx) => ({
            questionId: qid,
            order: idx + 1,
            marks: marksMap[qid] ?? 1,
          })),
        },
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return json(test, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create test", 500);
  }
}
