import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api-helpers";
import { hash } from "bcryptjs";
import { notifyUser } from "@/lib/notify";
import { emailLayout, sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || String(password).length < 6) {
    return error("Valid token and password (min 6 chars) required");
  }

  const row = await prisma.passwordResetToken.findUnique({ where: { token: String(token) } });
  if (!row || row.used || row.expiresAt < new Date()) {
    return error("Invalid or expired reset link", 400);
  }

  const passwordHash = await hash(String(password), 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { password: passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { used: true } }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (user) {
    await notifyUser({
      userId: user.id,
      title: "Password updated",
      body: "Your LMS password was changed successfully.",
      type: "ACCOUNT",
      email: false,
    });
    await sendEmail({
      to: user.email,
      subject: "Your SmartYugam password was changed",
      html: emailLayout(
        "Password updated",
        `<p>Hi ${user.name},</p><p>Your password was changed. If this wasn't you, contact your college admin immediately.</p>`
      ),
    });
  }

  return json({ ok: true });
}
