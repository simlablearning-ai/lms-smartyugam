import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { resolveCreatorId } from "@/lib/session-user";

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");

  const where: any = { isActive: true };

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    // College admin sees global banks + their college banks
    where.OR = [
      { collegeId: null },
      { collegeId: auth.session!.user.collegeId },
    ];
  } else if (collegeId) {
    where.OR = [{ collegeId: null }, { collegeId }];
  }

  const banks = await prisma.questionBank.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { questions: true } },
    },
  });

  return json(banks);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    let { name, description, collegeId } = body;

    if (!name) return error("Name is required");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    const createdById = await resolveCreatorId(auth.session);
    if (!createdById) {
      return error(
        "Your session is outdated (database was reset). Sign out and sign in again as Super Admin.",
        401
      );
    }

    const bank = await prisma.questionBank.create({
      data: {
        name,
        description: description || null,
        collegeId: collegeId || null,
        createdById,
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return json(bank, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create question bank", 500);
  }
}
