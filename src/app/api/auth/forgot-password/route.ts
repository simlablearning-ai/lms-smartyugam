import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api-helpers";
import { randomBytes } from "crypto";
import { emailLayout, sendEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notify";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return json({ ok: true }); // don't reveal

  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) return json({ ok: true });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  const link = `${base}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your SmartYugam LMS password",
    html: emailLayout(
      "Password reset",
      `<p>Hi ${user.name},</p>
       <p>We received a request to reset your password. This link expires in 1 hour.</p>
       <p><a href="${link}" style="background:#c45c26;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Reset password</a></p>
       <p style="font-size:12px;color:#6b6560">If you did not request this, you can ignore this email.</p>`
    ),
  });

  await notifyUser({
    userId: user.id,
    title: "Password reset requested",
    body: "A password reset link was sent to your email. It expires in 1 hour.",
    type: "ACCOUNT",
    email: false,
  });

  return json({ ok: true });
}
