import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN, Role.STUDENT]);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (!type || !id) return new Response("type and id required", { status: 400 });

  let title = "";
  let description = "";
  let start: Date | null = null;
  let end: Date | null = null;
  let location = "SmartYugam LMS";

  if (type === "test") {
    const t = await prisma.test.findUnique({ where: { id } });
    if (!t) return new Response("Not found", { status: 404 });
    title = t.title;
    description = "Scheduled assessment on SmartYugam LMS";
    start = t.startTime;
    end = t.endTime || (t.startTime ? new Date(t.startTime.getTime() + 60 * 60 * 1000) : null);
  } else if (type === "interview") {
    const a = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!a) return new Response("Not found", { status: 404 });
    if (auth.session!.user.role === Role.STUDENT && a.studentId !== auth.session!.user.id) {
      return new Response("Forbidden", { status: 403 });
    }
    title = `Interview: ${a.job.title} — ${a.job.companyName}`;
    description = [a.interviewRound, a.interviewInfo].filter(Boolean).join("\n");
    start = a.interviewAt;
    end = a.interviewAt ? new Date(a.interviewAt.getTime() + 60 * 60 * 1000) : null;
    location = a.interviewInfo || location;
  }

  if (!start) return new Response("No schedule set", { status: 400 });

  const uid = `${type}-${id}@smartyugam-lms`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SmartYugam LMS//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end || new Date(start.getTime() + 3600000))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description || title)}`,
    `LOCATION:${escapeIcs(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-invite.ics"`,
    },
  });
}
