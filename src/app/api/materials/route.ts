import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.FACULTY,
    Role.STUDENT,
  ]);
  if (auth.error) return auth.error;

  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId) return error("courseId required");

  if (auth.session!.user.role === Role.FACULTY) {
    const ok = await prisma.facultyCourseAssignment.findFirst({
      where: { facultyId: auth.session!.user.id, courseId },
    });
    if (!ok) return error("Forbidden", 403);
  }

  if (auth.session!.user.role === Role.STUDENT) {
    const enr = await prisma.enrollment.findFirst({
      where: { studentId: auth.session!.user.id, courseId },
    });
    if (!enr) return error("Forbidden", 403);
  }

  const materials = await prisma.courseMaterial.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });
  return json(materials);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.FACULTY]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { courseId, title, description, fileUrl, fileName } = body;
    if (!courseId || !title?.trim()) return error("courseId and title required");

    if (auth.session!.user.role === Role.FACULTY) {
      const ok = await prisma.facultyCourseAssignment.findFirst({
        where: { facultyId: auth.session!.user.id, courseId },
      });
      if (!ok) return error("Course not assigned", 403);
    }

    const mat = await prisma.courseMaterial.create({
      data: {
        courseId,
        title: title.trim(),
        description: description || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        uploadedById: auth.session!.user.id,
      },
    });
    return json(mat, 201);
  } catch (e: any) {
    return error(e.message || "Failed", 500);
  }
}
