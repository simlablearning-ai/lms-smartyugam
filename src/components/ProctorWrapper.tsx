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

export function ProctorWrapper({
  children,
  onViolation,
  maxViolations = 4, // 3 warnings + 4th = auto-kick
  onMaxViolationsReached,
}: ProctorWrapperProps) {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [kicked, setKicked] = useState(false);
  const violationsRef = useRef<Violation[]>([]);
  const kickedRef = useRef(false);

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

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      // User denied or not supported
    }
  }, []);

  useEffect(() => {
    // Force fullscreen on mount
    enterFullscreen();

    const handleVisibility = () => {
      if (document.hidden) {
        addViolation("TAB_SWITCH_OR_MINIMIZED");
      }
    };

    const handleBlur = () => {
      addViolation("WINDOW_BLUR");
    };

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        addViolation("EXITED_FULLSCREEN");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "u") ||
        (e.metaKey && e.key === "u")
      ) {
        e.preventDefault();
        addViolation("DEVTOOLS_ATTEMPT");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [addViolation, enterFullscreen]);

  return (
    <div className="proctor-mode relative min-h-screen">
      {/* Warning banner */}
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

      {/* Fullscreen prompt */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-40 bg-slate-900/90 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
            <Maximize className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Fullscreen Required
            </h2>
            <p className="text-slate-600 text-sm mb-6">
              This is a proctored assessment. You must stay in fullscreen mode.
              Leaving fullscreen or switching tabs will be recorded as a
              violation.
            </p>
            <button
              onClick={enterFullscreen}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg"
            >
              Enter Fullscreen & Continue
            </button>
            {violations.length > 0 && (
              <p className="mt-4 text-xs text-red-600">
                Violations so far: {violations.length}
              </p>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
