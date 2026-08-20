"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, Maximize } from "lucide-react";

type Violation = {
  type: string;
  timestamp: string;
};

interface ProctorWrapperProps {
  children: React.ReactNode;
  onViolation?: (violations: Violation[]) => void;
  maxViolations?: number;
  onMaxViolationsReached?: () => void;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone / iPod / iPad (classic) + iPadOS desktop UA with touch
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

function fullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    webkitRequestFullScreen?: () => Promise<void> | void;
  };
  return !!(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.webkitRequestFullScreen
  );
}

async function requestNativeFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    webkitRequestFullScreen?: () => Promise<void> | void;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
    if (el.webkitRequestFullScreen) {
      await el.webkitRequestFullScreen();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function ProctorWrapper({
  children,
  onViolation,
  maxViolations = 4,
  onMaxViolationsReached,
}: ProctorWrapperProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [kicked, setKicked] = useState(false);
  const [iosExamMode, setIosExamMode] = useState(false);
  const violationsRef = useRef<Violation[]>([]);
  const kickedRef = useRef(false);
  const iosExamModeRef = useRef(false);

  const addViolation = useCallback(
    (type: string) => {
      if (kickedRef.current) return;
      const v: Violation = { type, timestamp: new Date().toISOString() };
      const next = [...violationsRef.current, v];
      violationsRef.current = next;
      setViolations(next);
      onViolation?.(next);

      const count = next.length;
      if (count >= maxViolations) {
        kickedRef.current = true;
        setKicked(true);
        setWarningText(
          `Violation ${count}/${maxViolations}: limit reached. Your test is being submitted and locked.`
        );
        setShowWarning(true);
        onMaxViolationsReached?.();
      } else {
        const remaining = maxViolations - count;
        setWarningText(
          `Warning ${count}/${maxViolations - 1}: ${type.replace(/_/g, " ")}. ${remaining} more will auto-submit and lock this attempt.`
        );
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      }
    },
    [onViolation, maxViolations, onMaxViolationsReached]
  );

  const enterExamMode = useCallback(async () => {
    const ios = detectIOS();

    // Try native fullscreen (works on Android / desktop)
    const ok = await requestNativeFullscreen();
    if (ok || !!document.fullscreenElement) {
      setIsFullscreen(true);
      setIosExamMode(false);
      iosExamModeRef.current = false;
      return;
    }

    // iOS Safari (and some WebViews) do not support element fullscreen.
    // Enter secure exam mode so the student can take the test.
    if (ios || !fullscreenSupported()) {
      iosExamModeRef.current = true;
      setIosExamMode(true);
      setIsFullscreen(true);
      return;
    }

    // Non-iOS but API failed (user denied) — stay on gate so they can retry
  }, []);

  useEffect(() => {
    // Do not auto-call fullscreen on mount (browsers block it without gesture).
    // User must tap the button — required on iOS.

    const handleVisibility = () => {
      if (document.hidden) {
        addViolation("TAB_SWITCH_OR_MINIMIZED");
      }
    };

    // Window blur fires too often on iOS (keyboard, address bar). Use visibility only on iOS.
    const handleBlur = () => {
      if (detectIOS()) return;
      addViolation("WINDOW_BLUR");
    };

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      // In iOS exam mode we never had real fullscreen — ignore exit events
      if (iosExamModeRef.current) {
        return;
      }
      setIsFullscreen(fs);
      if (!fs) {
        addViolation("FULLSCREEN_EXIT");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !iosExamModeRef.current) {
        addViolation("ESCAPE_KEY");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addViolation]);

  const isIOS = typeof navigator !== "undefined" && detectIOS();

  return (
    <div className="proctor-mode relative min-h-screen">
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg shadow-lg max-w-lg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{warningText}</span>
        </div>
      )}

      {kicked && (
        <div className="fixed inset-0 z-[60] bg-slate-900/95 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Test locked</h2>
            <p className="text-slate-600 text-sm">
              You exceeded the allowed proctoring violations (3 warnings). This attempt is submitted
              as violated. Contact your College Admin to reset if needed.
            </p>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <div className="fixed inset-0 z-40 bg-slate-900/90 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
            <Maximize className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {isIOS ? "Exam mode required" : "Fullscreen required"}
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              {isIOS ? (
                <>
                  This is a proctored assessment. iPhone/iPad browsers cannot use true
                  fullscreen, so you will continue in <strong>secure exam mode</strong>.
                  Switching apps or leaving the page will still be recorded as a violation.
                </>
              ) : (
                <>
                  This is a proctored assessment. You must stay in fullscreen mode.
                  Leaving fullscreen or switching tabs will be recorded as a violation.
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                void enterExamMode();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg"
            >
              {isIOS ? "Continue in exam mode" : "Enter fullscreen & continue"}
            </button>
            {violations.length > 0 && (
              <p className="mt-4 text-xs text-red-600">
                Violations so far: {violations.length}
              </p>
            )}
          </div>
        </div>
      )}

      {iosExamMode && isFullscreen && (
        <div className="sticky top-0 z-30 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-3 py-1.5 text-center">
          iOS exam mode — stay on this page. Switching apps may be recorded.
        </div>
      )}

      {children}
    </div>
  );
}
