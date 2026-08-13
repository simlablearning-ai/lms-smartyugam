import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { compare, hash } from "bcryptjs";

/** Logged-in user changes own password */
export async function PUT(req: Request) {
  const auth = await requireAuth([
    Role.STUDENT,
    Role.SUPER_ADMIN,
    Role.COLLEGE_ADMIN,
  ]);
  if (auth.error) return auth.error;

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return error("Current password and new password (min 6 chars) required");
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.session!.user.id },
    });
    if (!user) return error("User not found", 404);

    const ok = await compare(String(currentPassword), user.password);
    if (!ok) return error("Current password is incorrect");

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hash(String(newPassword), 12) },
    });

    return json({ success: true });
  } catch (e: any) {
    return error(e.message || "Failed to change password", 500);
  }
}
