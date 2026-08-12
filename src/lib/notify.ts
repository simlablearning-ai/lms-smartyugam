import { prisma } from "@/lib/prisma";
import { emailLayout, sendEmail } from "@/lib/email";

type NotifyOpts = {
  userId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  meta?: Record<string, unknown>;
  email?: boolean;
};

export async function notifyUser(opts: NotifyOpts) {
  const n = await prisma.notification.create({
    data: {
      userId: opts.userId,
      title: opts.title,
      body: opts.body,
      type: opts.type,
      link: opts.link || null,
      meta: opts.meta ? JSON.stringify(opts.meta) : null,
    },
  });

  if (opts.email !== false) {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const base = process.env.NEXTAUTH_URL || process.env.APP_URL || "";
      const linkHtml = opts.link
        ? `<p style="margin-top:16px"><a href="${base}${opts.link}" style="background:#c45c26;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open in LMS</a></p>`
        : "";
      await sendEmail({
        to: user.email,
        subject: opts.title,
        html: emailLayout(
          opts.title,
          `<p>Hi ${user.name || "there"},</p><p>${opts.body}</p>${linkHtml}`
        ),
        text: `${opts.title}\n\n${opts.body}`,
      });
    }
  }

  // Browser push can be added later by installing `web-push` and wiring VAPID keys.
  // Avoid importing optional packages here so Vercel build always succeeds.

  return n;
}

export async function notifyUsers(
  userIds: string[],
  opts: Omit<NotifyOpts, "userId">
) {
  const ids = [...new Set(userIds.filter(Boolean))];
  for (const userId of ids) {
    await notifyUser({ ...opts, userId });
  }
}
