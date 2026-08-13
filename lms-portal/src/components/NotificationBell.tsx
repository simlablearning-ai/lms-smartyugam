"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { enableWebPush } from "@/lib/push-client";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const d = await fetch("/api/notifications").then((r) => r.json());
      setItems(d.items || []);
      setUnread(d.unreadCount || 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          load();
        }}
        className="relative p-2 rounded-xl hover:bg-black/5 text-[#3d3a35]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#c45c26] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-[#e5e0d6] bg-[#faf8f4] shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#ebe6dc] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#1a1814]">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-[#c45c26] font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#6b6560]">No notifications yet</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-[#f0ebe3] ${n.read ? "opacity-70" : "bg-[#fff8f3]/60"}`}
                >
                  <p className="text-sm font-medium text-[#1a1814]">{n.title}</p>
                  <p className="text-xs text-[#6b6560] mt-0.5 line-clamp-3">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-[#9a948a]">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => {
                          markOne(n.id);
                          setOpen(false);
                        }}
                        className="text-[10px] font-semibold text-[#c45c26]"
                      >
                        Open
                      </Link>
                    )}
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markOne(n.id)}
                        className="text-[10px] text-[#6b6560]"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-[#ebe6dc] bg-white/50">
            <button
              type="button"
              onClick={() => enableWebPush().catch(() => {})}
              className="text-[11px] text-[#c45c26] font-medium w-full text-left"
            >
              Enable browser push notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
