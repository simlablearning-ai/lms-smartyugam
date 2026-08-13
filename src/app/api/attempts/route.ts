import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.STUDENT]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { testId } = body;

    if (!testId) return error("testId is required");

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { questions: true },
    });

    if (!test) {
      return error("Test not found", 404);
    }

    const { checkTestLive } = await import("@/lib/test-live");
    const live = checkTestLive(test);
    if (!live.live) {
      return error(live.reason || "This test is not live yet.", 403);
    }

    // Resume in-progress attempt first (iOS refresh / reconnect must not burn an attempt)
    const inProgress = await prisma.testAttempt.findFirst({
      where: {
        testId,
        studentId: auth.session!.user.id,
        status: "IN_PROGRESS",
      },
    });

    if (inProgress) {
      return json(inProgress);
    }

    // Only finished attempts count toward the limit
    const finishedAttempts = await prisma.testAttempt.count({
      where: {
        testId,
        studentId: auth.session!.user.id,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED", "VIOLATED"] },
      },
    });

    if (finishedAttempts >= test.maxAttempts) {
      return error(
        `Maximum attempts (${test.maxAttempts}) reached. Ask your admin to increase attempts if needed.`
      );
    }

    const attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId: auth.session!.user.id,
        status: "IN_PROGRESS",
      },
    });

    return json(attempt, 201);
  } catch (e: any) {
    return error(e.message || "Failed to start attempt", 500);
  }
}
