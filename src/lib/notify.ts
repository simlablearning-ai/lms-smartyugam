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
        html: emailLayout(opts.title, `<p>Hi ${user.name || "there"},</p><p>${opts.body}</p>${linkHtml}`),
        text: `${opts.title}\n\n${opts.body}`,
      });
    }
  }

  // Best-effort web push
  try {
    await sendWebPushToUser(opts.userId, opts.title, opts.body, opts.link);
  } catch {
    /* optional */
  }

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

async function sendWebPushToUser(
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  // Dynamic import so build works without web-push installed
  let webpush: any;
  try {
    webpush = await import("web-push");
  } catch {
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@smartyugam.com",
    publicKey,
    privateKey
  );

  const payload = JSON.stringify({ title, body, link: link || "/" });
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
    } catch (e: any) {
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      }
    }
  }
}
