import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");
  const year = searchParams.get("year");

  const where: any = { role: Role.STUDENT, isActive: true };

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (collegeId) {
    where.collegeId = collegeId;
  }

  if (departmentId) where.departmentId = departmentId;
  if (year) where.year = parseInt(year);

  const students = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      year: true,
      isActive: true,
      createdAt: true,
      college: { select: { id: true, name: true, code: true } },
      department: { select: { id: true, name: true, code: true } },
    },
  });

  return json(students);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let { name, email, password, collegeId, departmentId, year } = body;

    if (!name || !email) {
      return error("Name and Email are required");
    }

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    if (!collegeId) {
      return error("College is required");
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return error("Email already registered");
    }

    const hashed = await hash(password || "password123", 12);

    const student = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashed,
        role: Role.STUDENT,
        collegeId,
        departmentId: departmentId || null,
        year: year ? parseInt(year) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        year: true,
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    return json(student, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create student", 500);
  }
}
