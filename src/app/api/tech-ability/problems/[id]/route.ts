import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.STUDENT,
  ]);
  if (auth.error) return auth.error;

  const { id } = await params;
  const problem = await prisma.techProblem.findUnique({
    where: { id },
  });
  if (!problem) return error("Problem not found", 404);

  // Students never see solution or hidden expected outputs in detail view
  if (auth.session!.user.role === Role.STUDENT) {
    const cases = JSON.parse(problem.testCases || "[]").map((c: any) => ({
      input: c.input,
      expectedOutput: c.isHidden ? undefined : c.expectedOutput,
      isHidden: !!c.isHidden,
    }));
    return json({
      ...problem,
      solutionCode: undefined,
      testCases: JSON.stringify(cases),
    });
  }

  return json(problem);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.language !== undefined) data.language = body.language;
    if (body.starterCode !== undefined) data.starterCode = body.starterCode;
    if (body.solutionCode !== undefined) data.solutionCode = body.solutionCode;
    if (body.testCases !== undefined) {
      data.testCases =
        typeof body.testCases === "string"
          ? body.testCases
          : JSON.stringify(body.testCases);
    }
    if (body.marks !== undefined) data.marks = parseInt(String(body.marks), 10);
    if (body.difficulty !== undefined)
      data.difficulty = parseInt(String(body.difficulty), 10);
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.collegeId !== undefined && auth.session!.user.role === Role.SUPER_ADMIN) {
      data.collegeId = body.collegeId || null;
    }

    const updated = await prisma.techProblem.update({
      where: { id },
      data,
    });
    return json(updated);
  } catch (e: any) {
    return error(e.message || "Update failed", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    await prisma.techProblem.update({
      where: { id },
      data: { isActive: false },
    });
    return json({ ok: true });
  } catch (e: any) {
    return error(e.message || "Delete failed", 500);
  }
}
