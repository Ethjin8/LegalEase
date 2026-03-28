"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "hidden" | "closing" | "covered" | "revealing";

export default function TransitionReveal() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [showLoader, setShowLoader] = useState(false);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Detect route change — when pathname changes while curtain is closing/covered,
  // the navigation has landed. Start the reveal.
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      if (phase === "closing" || phase === "covered") {
        // Navigation landed — reveal the new page
        setPhase("covered");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPhase("revealing"));
        });
      }
    }
  }, [pathname, phase]);

  // Listen for a custom event dispatched by the landing page to start closing
  useEffect(() => {
    function handleClose() {
      setPhase("closing");
    }
    window.addEventListener("curtain-close", handleClose);
    return () => window.removeEventListener("curtain-close", handleClose);
  }, []);

  // After close animation finishes, hold in covered state
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("covered"), 700);
    return () => clearTimeout(timer);
  }, [phase]);

  // After reveal animation finishes, hide
  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(() => setPhase("hidden"), 750);
    return () => clearTimeout(timer);
  }, [phase]);

  // Show loading dot if stuck in covered state for 400ms+
  useEffect(() => {
    if (phase !== "covered") {
      setShowLoader(false);
      return;
    }
    const timer = setTimeout(() => setShowLoader(true), 400);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  const cls =
    phase === "closing"
      ? "transition-overlay active"
      : phase === "revealing"
      ? "transition-overlay reveal"
      : "transition-overlay covered";

  return (
    <div className={cls} style={{ pointerEvents: "none" }}>
      <div className="transition-panel transition-panel--left" />
      <div className="transition-panel transition-panel--right" />
      {showLoader && <div className="transition-loader" />}
    </div>
  );
}
