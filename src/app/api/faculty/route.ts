import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");

  const where: any = { role: Role.FACULTY, isActive: true };
  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (collegeId) {
    where.collegeId = collegeId;
  }

  const faculty = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      collegeId: true,
      departmentId: true,
      isActive: true,
      createdAt: true,
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
      facultyAssignments: {
        include: {
          course: { select: { id: true, title: true, code: true } },
        },
      },
    },
  });

  return json(faculty);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let { name, email, password, collegeId, departmentId, courseIds } = body;

    if (!name?.trim()) return error("Name is required");
    const emailVal = email != null ? String(email).trim().toLowerCase() : "";
    if (!emailVal) return error("Email is required for faculty login");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }
    if (!collegeId) return error("College is required");

    const existing = await prisma.user.findUnique({ where: { email: emailVal } });
    if (existing) return error("Email already registered");

    const hashed = await hash(password || "123456", 12);

    const faculty = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailVal,
        password: hashed,
        role: Role.FACULTY,
        collegeId,
        departmentId: departmentId || null,
      },
    });

    const ids: string[] = Array.isArray(courseIds) ? courseIds.filter(Boolean) : [];
    if (ids.length) {
      await prisma.facultyCourseAssignment.createMany({
        data: ids.map((courseId) => ({
          facultyId: faculty.id,
          courseId,
          assignedById: auth.session!.user.id,
        })),
        skipDuplicates: true,
      });
    }

    const full = await prisma.user.findUnique({
      where: { id: faculty.id },
      select: {
        id: true,
        name: true,
        email: true,
        collegeId: true,
        departmentId: true,
        college: { select: { id: true, name: true } },
        facultyAssignments: {
          include: { course: { select: { id: true, title: true } } },
        },
      },
    });

    return json(full, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create faculty", 500);
  }
}
