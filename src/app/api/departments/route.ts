import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");

  const where: any = { isActive: true };

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
  } else if (collegeId) {
    where.collegeId = collegeId;
  }

  const departments = await prisma.department.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { users: true, courses: true } },
    },
  });

  return json(departments);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let { name, code, collegeId } = body;

    if (!name || !code) {
      return error("Name and Code are required");
    }

    // College Admin can only create in their own college
    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    if (!collegeId) {
      return error("College is required");
    }

    const existing = await prisma.department.findFirst({
      where: { collegeId, code },
    });
    if (existing) {
      return error("Department code already exists in this college");
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code.toUpperCase(),
        collegeId,
      },
      include: {
        college: { select: { id: true, name: true, code: true } },
      },
    });

    return json(department, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create department", 500);
  }
}
