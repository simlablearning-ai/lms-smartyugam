"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Scroll window to top so users aren't stuck mid-page behind overlay
    const y = window.scrollY;
    return () => {
      document.body.style.overflow = prev;
      // don't force scroll restore aggressively
      void y;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const sizeClass =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-[#12151c]/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative z-[101] bg-[#faf8f4] border border-[#e5e0d6] rounded-2xl shadow-[0_24px_64px_-16px_rgba(18,21,28,0.35)] w-full ${sizeClass} max-h-[min(90vh,900px)] flex flex-col my-4 sm:my-6`}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#ebe6dc] shrink-0 sticky top-0 bg-[#faf8f4] rounded-t-2xl z-10">
          <h2 className="font-display text-lg font-medium text-[#1a1814] tracking-tight pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#efeae2] text-[#6b6560] shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );

  // Portal avoids dashboard overflow/transform trapping the dialog off-screen
  return createPortal(node, document.body);
}
