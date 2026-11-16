import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { resolveCreatorId } from "@/lib/session-user";

export async function GET(req: Request) {
  const auth = await requireAuth([
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
    Role.STUDENT,
  ]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const collegeId = searchParams.get("collegeId");
  const departmentId = searchParams.get("departmentId");

  const where: any = {};

  if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
    where.collegeId = auth.session!.user.collegeId;
    where.status = { not: "ARCHIVED" };
  } else if (auth.session!.user.role === Role.STUDENT) {
    const sidCollege = auth.session!.user.collegeId;
    const sidDept = auth.session!.user.departmentId;
    where.collegeId = sidCollege;
    where.status = "PUBLISHED";
    if (sidDept) {
      where.OR = [{ departmentId: null }, { departmentId: sidDept }];
    }
  } else if (collegeId) {
    where.collegeId = collegeId;
    where.status = { not: "ARCHIVED" };
  } else {
    where.status = { not: "ARCHIVED" };
  }

  if (departmentId) where.departmentId = departmentId;

  const tests = await prisma.techTest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true, code: true } },
      college: { select: { id: true, name: true, code: true } },
      _count: { select: { attempts: true, problems: true } },
    },
  });

  return json(tests);
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
      collegeId,
      departmentId,
      durationMinutes,
      totalMarks,
      passingMarks,
      isProctored,
      status,
      maxAttempts,
      problemIds,
      startTime,
      endTime,
    } = body;

    if (!title?.trim()) return error("Title is required");

    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      collegeId = auth.session!.user.collegeId;
    }
    if (!collegeId) return error("College is required");

    const ids: string[] = Array.isArray(problemIds) ? problemIds : [];
    if (!ids.length) return error("Select at least one coding problem");

    const problems = await prisma.techProblem.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, marks: true },
    });
    if (!problems.length) return error("No valid problems found");

    const marksMap = Object.fromEntries(problems.map((p) => [p.id, p.marks]));

    const test = await prisma.techTest.create({
      data: {
        title: title.trim(),
        description: description || null,
        collegeId,
        departmentId: departmentId || null,
        durationMinutes: durationMinutes ? parseInt(String(durationMinutes), 10) : 60,
        totalMarks: totalMarks ? parseInt(String(totalMarks), 10) : 100,
        passingMarks: passingMarks ? parseInt(String(passingMarks), 10) : 40,
        isProctored: isProctored !== false,
        status: status || "DRAFT",
        maxAttempts: maxAttempts ? parseInt(String(maxAttempts), 10) : 1,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        createdById,
        problems: {
          create: ids.map((pid, idx) => ({
            problemId: pid,
            order: idx + 1,
            marks: marksMap[pid] ?? 10,
          })),
        },
      },
      include: {
        _count: { select: { problems: true } },
      },
    });

    return json(test, 201);
  } catch (e: any) {
    return error(e.message || "Failed to create tech test", 500);
  }
}
