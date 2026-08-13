import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { jobId, studentId, reason } = await req.json();
    if (!jobId || !studentId) return error("jobId and studentId required");

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) return error("Student not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      student.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    const block = await prisma.placementBlock.upsert({
      where: { jobId_studentId: { jobId, studentId } },
      create: {
        jobId,
        studentId,
        reason: reason || null,
        createdById: auth.session!.user.id,
      },
      update: { reason: reason || null },
    });

    // Also mark application blocked if exists
    await prisma.jobApplication.updateMany({
      where: { jobId, studentId },
      data: { status: "BLOCKED" },
    });

    return json(block, 201);
  } catch (e: any) {
    return error(e.message || "Failed to block", 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth([Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const studentId = searchParams.get("studentId");
  if (!jobId || !studentId) return error("jobId and studentId required");

  await prisma.placementBlock.deleteMany({ where: { jobId, studentId } });
  return json({ success: true });
}
