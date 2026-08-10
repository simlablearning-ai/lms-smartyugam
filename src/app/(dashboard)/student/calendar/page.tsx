"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CalendarDays, Download, Briefcase, ClipboardList } from "lucide-react";
import Link from "next/link";

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.events || []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell role="STUDENT">
      <div className="space-y-5 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-medium text-[#1a1814]">Calendar</h1>
          <p className="text-sm text-[#6b6560] mt-1">Upcoming tests & interviews · download invites</p>
        </div>

        <div className="rounded-2xl border border-[#e5e0d6] bg-white divide-y divide-[#f0ebe3]">
          {loading ? (
            <p className="p-10 text-center text-sm text-[#6b6560]">Loading…</p>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#6b6560]">
              <CalendarDays className="h-10 w-10 mx-auto text-[#d4cec3] mb-2" />
              No scheduled events yet
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="p-4 sm:p-5 flex gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    e.type === "INTERVIEW" ? "bg-[#fff8f3] text-[#c45c26]" : "bg-[#e2f0ed] text-[#1a6b5c]"
                  }`}
                >
                  {e.type === "INTERVIEW" ? <Briefcase className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1a1814]">{e.title}</p>
                  <p className="text-sm text-[#6b6560]">{e.subtitle}</p>
                  {e.start && (
                    <p className="text-xs text-[#9a948a] mt-1">
                      {new Date(e.start).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      IST
                      {e.end &&
                        ` – ${new Date(e.end).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </p>
                  )}
                  {e.description && (
                    <p className="text-xs text-[#5a554e] mt-1 whitespace-pre-wrap line-clamp-3">{e.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {e.link && (
                      <Link href={e.link} className="text-xs font-semibold text-[#c45c26]">
                        Open
                      </Link>
                    )}
                    {e.start && e.id.startsWith("interview-") && (
                      <a
                        href={`/api/calendar/ics?type=interview&id=${e.id.replace("interview-", "")}`}
                        className="text-xs font-medium text-[#6b6560] inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Add to calendar (.ics)
                      </a>
                    )}
                    {e.start && e.id.startsWith("test-") && (
                      <a
                        href={`/api/calendar/ics?type=test&id=${e.id.replace("test-", "")}`}
                        className="text-xs font-medium text-[#6b6560] inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Add to calendar (.ics)
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
