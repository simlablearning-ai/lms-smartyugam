import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      department: true,
      course: true,
      college: true,
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: true,
        },
      },
      _count: { select: { attempts: true } },
    },
  });

  if (!test) return error("Test not found", 404);

  // For students, hide correct answers
  if (auth.session!.user.role === Role.STUDENT) {
    const safe = {
      ...test,
      questions: test.questions.map((tq) => ({
        id: tq.id,
        marks: tq.marks,
        order: tq.order,
        question: {
          id: tq.question.id,
          text: tq.question.text,
          type: tq.question.type,
          options: tq.question.options,
          marks: tq.question.marks,
        },
      })),
    };
    return json(safe);
  }

  return json(test);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      durationMinutes,
      totalMarks,
      passingMarks,
      isProctored,
      status,
      maxAttempts,
      departmentId,
      courseId,
      questionIds,
      startTime,
      endTime,
    } = body;

    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) return error("Test not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    // Replace linked questions if questionIds provided
    if (Array.isArray(questionIds)) {
      await prisma.testQuestion.deleteMany({ where: { testId: id } });
      if (questionIds.length > 0) {
        await prisma.testQuestion.createMany({
          data: questionIds.map((qid: string, idx: number) => ({
            testId: id,
            questionId: qid,
            order: idx + 1,
            marks: 1,
          })),
        });
      }
    }

    const test = await prisma.test.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(durationMinutes !== undefined && { durationMinutes: parseInt(durationMinutes) }),
        ...(totalMarks !== undefined && { totalMarks: parseInt(totalMarks) }),
        ...(passingMarks !== undefined && { passingMarks: parseInt(passingMarks) }),
        ...(isProctored !== undefined && { isProctored }),
        ...(status !== undefined && { status }),
        ...(maxAttempts !== undefined && { maxAttempts: parseInt(maxAttempts) }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(courseId !== undefined && { courseId: courseId || null }),
        ...(startTime !== undefined && {
          startTime: startTime ? new Date(startTime) : null,
        }),
        ...(endTime !== undefined && {
          endTime: endTime ? new Date(endTime) : null,
        }),
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return json(test);
  } catch (e: any) {
    return error(e.message || "Failed to update test", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) return error("Test not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    // Permanent delete: clear dependents first (attempts may not cascade)
    await prisma.answer.deleteMany({
      where: { attempt: { testId: id } },
    });
    await prisma.testAttempt.deleteMany({ where: { testId: id } });
    await prisma.testQuestion.deleteMany({ where: { testId: id } });
    // Unlink module assessments pointing at this test
    await prisma.courseModule.updateMany({
      where: { assessmentTestId: id },
      data: { assessmentTestId: null },
    });
    await prisma.course.updateMany({
      where: { finalTestId: id },
      data: { finalTestId: null },
    }).catch(() => {});

    await prisma.test.delete({ where: { id } });

    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete test", 500);
  }
}
