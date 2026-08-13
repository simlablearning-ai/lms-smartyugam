import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { notifyUser } from "@/lib/notify";

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
      rollNumber: true,
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
    let { name, email, password, collegeId, departmentId, year, rollNumber } = body;

    if (!name) return error("Name is required");
    const roll = rollNumber != null ? String(rollNumber).trim() : "";
    if (!roll) return error("Roll Number is required (used as login username)");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }
    if (!collegeId) return error("College is required");

    const emailVal =
      email != null && String(email).trim() !== ""
        ? String(email).trim().toLowerCase()
        : null;

    const existingRoll = await prisma.user.findFirst({
      where: { rollNumber: { equals: roll, mode: "insensitive" } },
    });
    if (existingRoll) return error("Roll Number already registered");

    if (emailVal) {
      const existingEmail = await prisma.user.findUnique({ where: { email: emailVal } });
      if (existingEmail) return error("Email already registered");
    }

    const hashed = await hash(password || "123456", 12);

    const student = await prisma.user.create({
      data: {
        name,
        email: emailVal,
        password: hashed,
        role: Role.STUDENT,
        collegeId,
        departmentId: departmentId || null,
        year: year ? parseInt(year) : null,
        rollNumber: roll,
      },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        year: true,
        college: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    try {
      await notifyUser({
        userId: student.id,
        title: "Welcome to SmartYugam LMS",
        body: `Your student account is ready. Sign in with Roll Number: ${student.rollNumber} (default password if not set: 123456).`,
        type: "ACCOUNT",
        link: "/login",
        email: !!student.email,
      });
    } catch {}

    return json(student, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create student", 500);
  }
}
