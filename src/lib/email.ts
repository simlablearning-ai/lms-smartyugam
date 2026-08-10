/**
 * Email via Resend HTTP API.
 * Set RESEND_API_KEY and EMAIL_FROM in env (e.g. on Vercel).
 * If missing, emails are skipped (logged) so the app still works.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "SmartYugam LMS <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[email:skipped]", opts.to, opts.subject);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[email:fail]", err);
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[email:error]", e.message);
    return { ok: false, error: e.message };
  }
}

export function emailLayout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f3f0e9;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e0d6;overflow:hidden">
    <div style="background:#12151c;color:#faf8f4;padding:16px 20px;font-weight:600">SmartYugam LMS</div>
    <div style="padding:20px">
      <h1 style="font-size:18px;margin:0 0 12px;color:#1a1814">${title}</h1>
      <div style="font-size:14px;line-height:1.55;color:#3d3a35">${bodyHtml}</div>
    </div>
    <div style="padding:12px 20px;font-size:11px;color:#9a948a;border-top:1px solid #ebe6dc">Campus learning · assessments · placement</div>
  </div></body></html>`;
}
