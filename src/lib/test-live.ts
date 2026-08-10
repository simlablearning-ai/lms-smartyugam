/**
 * Test availability helpers.
 * Schedule windows are interpreted in IST (Asia/Kolkata, UTC+5:30).
 */

export type LiveCheck = {
  live: boolean;
  reason?: string;
  opensAt?: string | null;
  closesAt?: string | null;
};

/** Convert datetime-local value (as typed in IST) to a UTC Date for storage. */
export function istLocalInputToUtc(local: string | null | undefined): Date | null {
  if (!local || !String(local).trim()) return null;
  // "YYYY-MM-DDTHH:mm" treated as Asia/Kolkata
  const normalized = String(local).trim();
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const d = new Date(`${withSeconds}+05:30`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Format a stored UTC Date into datetime-local string in IST. */
export function utcToIstLocalInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Human-readable IST label. */
export function formatIst(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d) + " IST";
}

/**
 * Is the test currently accessible to students?
 * Rules:
 * - status must be PUBLISHED
 * - if startTime set and now < start → not open yet
 * - if endTime set and now > end → closed
 */
export function checkTestLive(test: {
  status: string;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
}): LiveCheck {
  if (test.status !== "PUBLISHED") {
    return {
      live: false,
      reason: "This test is not live yet. Please wait for your admin to enable it.",
      opensAt: test.startTime ? formatIst(test.startTime) : null,
      closesAt: test.endTime ? formatIst(test.endTime) : null,
    };
  }

  const now = Date.now();
  if (test.startTime) {
    const start = new Date(test.startTime).getTime();
    if (now < start) {
      return {
        live: false,
        reason: `This test is scheduled to open at ${formatIst(test.startTime)}.`,
        opensAt: formatIst(test.startTime),
        closesAt: test.endTime ? formatIst(test.endTime) : null,
      };
    }
  }
  if (test.endTime) {
    const end = new Date(test.endTime).getTime();
    if (now > end) {
      return {
        live: false,
        reason: `This test closed at ${formatIst(test.endTime)}.`,
        opensAt: test.startTime ? formatIst(test.startTime) : null,
        closesAt: formatIst(test.endTime),
      };
    }
  }

  return {
    live: true,
    opensAt: test.startTime ? formatIst(test.startTime) : null,
    closesAt: test.endTime ? formatIst(test.endTime) : null,
  };
}
