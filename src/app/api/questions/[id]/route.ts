import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

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
      text,
      type,
      options,
      correctAnswer,
      explanation,
      difficulty,
      marks,
      departmentId,
      isActive,
      imageUrl,
      optionImages,
    } = body;

    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return error("Question not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(type !== undefined && { type }),
        ...(options !== undefined && {
          options: typeof options === "string" ? options : JSON.stringify(options),
        }),
        ...(correctAnswer !== undefined && { correctAnswer }),
        ...(explanation !== undefined && { explanation }),
        ...(difficulty !== undefined && { difficulty: parseInt(difficulty) }),
        ...(marks !== undefined && { marks: parseInt(marks) }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(optionImages !== undefined && {
          optionImages:
            optionImages == null
              ? null
              : typeof optionImages === "string"
                ? optionImages
                : JSON.stringify(optionImages),
        }),
      } as any,
    });

    return json(question);
  } catch (e: any) {
    return error(e.message || "Failed to update question", 500);
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
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) return error("Question not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });

    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to delete question", 500);
  }
}
