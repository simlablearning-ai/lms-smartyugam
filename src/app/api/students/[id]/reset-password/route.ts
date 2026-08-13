import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { notifyUser } from "@/lib/notify";

/** Super Admin (or college admin for own students) resets student password */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const newPassword = body.password ? String(body.password) : "123456";

    if (newPassword.length < 4) return error("Password too short");

    const student = await prisma.user.findUnique({ where: { id } });
    if (!student || student.role !== Role.STUDENT) {
      return error("Student not found", 404);
    }

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      student.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    await prisma.user.update({
      where: { id },
      data: { password: await hash(newPassword, 12) },
    });

    try {
      await notifyUser({
        userId: id,
        title: "Password reset by admin",
        body: "Your LMS password was reset by an administrator. Use the new password shared with you, then change it from Profile if needed.",
        type: "ACCOUNT",
        email: false,
      });
    } catch {}

    return json({ success: true, temporaryPassword: newPassword });
  } catch (e: any) {
    return error(e.message || "Reset failed", 500);
  }
}
