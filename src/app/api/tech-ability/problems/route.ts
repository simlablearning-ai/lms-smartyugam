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
    where.OR = [
      { collegeId: auth.session!.user.collegeId },
      { collegeId: null },
    ];
  } else if (collegeId) {
    where.collegeId = collegeId;
  }

  const problems = await prisma.techProblem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      college: { select: { id: true, name: true } },
      _count: { select: { testProblems: true } },
    },
  });

  return json(problems);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const createdById = await resolveCreatorId(auth.session);
    if (!createdById) {
      return error("Session outdated. Sign out and sign in again.", 401);
    }

    const body = await req.json();
    let {
      title,
      description,
      language,
      starterCode,
      solutionCode,
      testCases,
      marks,
      difficulty,
      collegeId,
    } = body;

    if (!title?.trim()) return error("Title is required");
    if (!description?.trim()) return error("Description is required");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }

    const casesStr =
      typeof testCases === "string"
        ? testCases
        : JSON.stringify(Array.isArray(testCases) ? testCases : []);

    const problem = await prisma.techProblem.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        language: language || "PYTHON",
        starterCode: starterCode || null,
        solutionCode: solutionCode || null,
        testCases: casesStr,
        marks: marks ? parseInt(String(marks), 10) : 10,
        difficulty: difficulty ? parseInt(String(difficulty), 10) : 1,
        collegeId: collegeId || null,
        createdById,
      },
    });

    return json(problem, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create problem", 500);
  }
}
