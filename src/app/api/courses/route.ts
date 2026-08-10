import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");

  const where: any = { isActive: true };

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (collegeId) {
    where.collegeId = collegeId;
  }
  if (departmentId) where.departmentId = departmentId;

  const courses = await prisma.course.findMany({
    where,
    orderBy: { title: "asc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      _count: { select: { enrollments: true, tests: true } },
    },
  });

  return json(courses);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let { title, description, code, collegeId, departmentId, passingScore } = body;

    if (!title) return error("Title is required");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    const course = await prisma.course.create({
      data: {
        title,
        description: description || null,
        code: code || null,
        collegeId: collegeId || null,
        departmentId: departmentId || null,
        passingScore: passingScore ? parseInt(passingScore) : 40,
        createdById: auth.session!.user.id,
      },
      include: {
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return json(course, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create course", 500);
  }
}
