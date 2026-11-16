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
  const test = await prisma.techTest.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      college: { select: { id: true, name: true } },
      problems: {
        orderBy: { order: "asc" },
        include: {
          problem: true,
        },
      },
      _count: { select: { attempts: true, problems: true } },
    },
  });

  if (!test) return error("Tech test not found", 404);

  // Students: strip solution + hidden expected outputs
  if (auth.session!.user.role === Role.STUDENT) {
    const problems = test.problems.map((tp) => {
      const p = tp.problem;
      let cases: any[] = [];
      try {
        cases = JSON.parse(p.testCases || "[]");
      } catch {}
      const publicCases = cases.map((c: any) => ({
        input: c.input,
        expectedOutput: c.isHidden ? undefined : c.expectedOutput,
        isHidden: !!c.isHidden,
      }));
      return {
        id: tp.id,
        marks: tp.marks,
        order: tp.order,
        problem: {
          id: p.id,
          title: p.title,
          description: p.description,
          language: p.language,
          starterCode: p.starterCode,
          testCases: JSON.stringify(publicCases),
          marks: p.marks,
          difficulty: p.difficulty,
        },
      };
    });
    return json({ ...test, problems });
  }

  return json(test);
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
    if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
    if (body.durationMinutes !== undefined)
      data.durationMinutes = parseInt(String(body.durationMinutes), 10);
    if (body.totalMarks !== undefined)
      data.totalMarks = parseInt(String(body.totalMarks), 10);
    if (body.passingMarks !== undefined)
      data.passingMarks = parseInt(String(body.passingMarks), 10);
    if (body.isProctored !== undefined) data.isProctored = !!body.isProctored;
    if (body.status !== undefined) data.status = body.status;
    if (body.maxAttempts !== undefined)
      data.maxAttempts = parseInt(String(body.maxAttempts), 10);
    if (body.startTime !== undefined)
      data.startTime = body.startTime ? new Date(body.startTime) : null;
    if (body.endTime !== undefined)
      data.endTime = body.endTime ? new Date(body.endTime) : null;

    // Replace problems if provided
    if (Array.isArray(body.problemIds)) {
      const ids: string[] = body.problemIds;
      const problems = await prisma.techProblem.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, marks: true },
      });
      const marksMap = Object.fromEntries(problems.map((p) => [p.id, p.marks]));

      await prisma.techTestProblem.deleteMany({ where: { testId: id } });
      await prisma.techTestProblem.createMany({
        data: ids.map((pid, idx) => ({
          testId: id,
          problemId: pid,
          order: idx + 1,
          marks: marksMap[pid] ?? 10,
        })),
      });
    }

    const updated = await prisma.techTest.update({
      where: { id },
      data,
      include: {
        _count: { select: { problems: true, attempts: true } },
      },
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
    await prisma.techTest.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return json({ ok: true });
  } catch (e: any) {
    return error(e.message || "Delete failed", 500);
  }
}
