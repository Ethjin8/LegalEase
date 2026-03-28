"use client";

import { useEffect, useState } from "react";

type Phase = "hidden" | "covered" | "revealing";

export default function TransitionReveal() {
  const [phase, setPhase] = useState<Phase>("covered");

  useEffect(() => {
    if (sessionStorage.getItem("doReveal") === "1") {
      sessionStorage.removeItem("doReveal");
      // Two rAFs ensure the browser has painted the covered state before
      // we add the reveal animation class.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase("revealing"));
      });
    } else {
      setPhase("hidden");
    }
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    const timer = setTimeout(() => setPhase("hidden"), 750);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  const cls =
    phase === "covered" ? "transition-overlay covered" : "transition-overlay reveal";

  return (
    <div className={cls} style={{ pointerEvents: "none" }}>
      <div className="transition-panel transition-panel--left" />
      <div className="transition-panel transition-panel--right" />
    </div>
  );
}
