import { prisma } from "@/lib/prisma";
import { AttendanceSource, AttendanceStatus } from "@prisma/client";

/** Normalize to UTC midnight for a calendar day string YYYY-MM-DD (IST intent: pass local date string). */
export function dayStart(dateStr: string): Date {
  // Treat as pure calendar date at 00:00:00.000Z
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDayString(d: Date): string {
  const x = new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const day = String(x.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mark PRESENT for a student on test/coding submit (idempotent). */
export async function markTestAttendance(opts: {
  studentId: string;
  source: "TEST" | "CODING_TEST";
  testId?: string;
  techTestId?: string;
  attemptId?: string;
  courseId?: string | null;
}) {
  const now = new Date();
  const dateStr = toDayString(now);
  const date = dayStart(dateStr);

  // Avoid duplicates for same student+test
  if (opts.source === "TEST" && opts.testId) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        studentId: opts.studentId,
        source: AttendanceSource.TEST,
        testId: opts.testId,
      },
    });
    if (existing) return existing;
  }
  if (opts.source === "CODING_TEST" && opts.techTestId) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        studentId: opts.studentId,
        source: AttendanceSource.CODING_TEST,
        techTestId: opts.techTestId,
      },
    });
    if (existing) return existing;
  }

  return prisma.attendanceRecord.create({
    data: {
      studentId: opts.studentId,
      date,
      status: AttendanceStatus.PRESENT,
      source:
        opts.source === "TEST"
          ? AttendanceSource.TEST
          : AttendanceSource.CODING_TEST,
      testId: opts.testId || null,
      techTestId: opts.techTestId || null,
      attemptId: opts.attemptId || null,
      courseId: opts.courseId || null,
    },
  });
}
