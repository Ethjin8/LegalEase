"use client";

import { useState } from "react";
import AuthModal from "@/components/AuthModal";
import Sidebar from "@/components/Sidebar";
import WorkspaceView from "@/components/WorkspaceView";

type IconType = "globe" | "house" | "briefcase" | "dollar" | "shield" | "scales" | "heart" | "graduation";

const SVG_PROPS = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CardIcon({ type }: { type: IconType }) {
  switch (type) {
    case "globe":
      return (
        <svg {...SVG_PROPS}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        </svg>
      );
    case "house":
      return (
        <svg {...SVG_PROPS}>
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...SVG_PROPS}>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      );
    case "dollar":
      return (
        <svg {...SVG_PROPS}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...SVG_PROPS}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "scales":
      return (
        <svg {...SVG_PROPS}>
          <line x1="12" y1="3" x2="12" y2="15" />
          <path d="M5 12l7-9 7 9" />
          <path d="M5 12a7 7 0 0 0 14 0" />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      );
    case "heart":
      return (
        <svg {...SVG_PROPS}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "graduation":
      return (
        <svg {...SVG_PROPS}>
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c0 0 2.5 3 6 3s6-3 6-3v-5" />
          <line x1="22" y1="10" x2="22" y2="16" />
        </svg>
      );
  }
}

const CARDS: {
  category: string;
  color: string;
  icon: IconType;
  top: string;
  left: string;
  animation: string;
}[] = [
  { category: "Immigration", color: "#3B82F6", icon: "globe", top: "5%", left: "8%", animation: "drift0 38s ease-in-out infinite" },
  { category: "Housing", color: "#6DAB7B", icon: "house", top: "3%", left: "44%", animation: "drift1 42s ease-in-out infinite" },
  { category: "Employment", color: "#D4A056", icon: "briefcase", top: "7%", left: "80%", animation: "drift2 35s ease-in-out infinite" },
  { category: "Financial", color: "#E8C547", icon: "dollar", top: "40%", left: "3%", animation: "drift3 46s ease-in-out infinite" },
  { category: "Benefits", color: "#E88B9C", icon: "shield", top: "38%", left: "83%", animation: "drift4 40s ease-in-out infinite" },
  { category: "Legal", color: "#5B8A9A", icon: "scales", top: "73%", left: "10%", animation: "drift5 44s ease-in-out infinite" },
  { category: "Healthcare", color: "#E05A7A", icon: "heart", top: "75%", left: "46%", animation: "drift6 36s ease-in-out infinite" },
  { category: "Education", color: "#7C5CBF", icon: "graduation", top: "70%", left: "78%", animation: "drift7 48s ease-in-out infinite" },
];

const WAVE_BARS = Array.from({ length: 40 }, (_, i) => {
  const animations = ["wave0", "wave1", "wave2", "wave3", "wave4"];
  const anim = animations[i % 5];
  const duration = 1.8 + (i * 0.37) % 2.1;
  const delay = (i * 0.13) % 1.5;
  const height = 24 + (i * 7) % 36;
  return { anim, duration, delay, height };
});

function Waveform() {
  return (
    <div className="waveform">
      {WAVE_BARS.map((bar, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: bar.height,
            animation: `${bar.anim} ${bar.duration}s ease-in-out ${bar.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

type View = "landing" | "workspace";
type TransitionPhase = "idle" | "closing" | "opening";

export default function HomePage() {
  const [view, setView] = useState<View>("landing");
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [showAuth, setShowAuth] = useState(false);

  function handleGetStarted() {
    setShowAuth(true);
  }

  function handleAuthComplete() {
    setShowAuth(false);
    if (phase !== "idle") return;
    setPhase("closing");
    setTimeout(() => {
      setView("workspace");
      setPhase("opening");
      setTimeout(() => setPhase("idle"), 700);
    }, 700);
  }

  const overlayClass =
    phase === "closing" ? "transition-overlay active" :
    phase === "opening" ? "transition-overlay reveal" :
    "transition-overlay";

  return (
    <>
      {phase !== "idle" && (
        <div className={overlayClass}>
          <div className="transition-panel transition-panel--left" />
          <div className="transition-panel transition-panel--right" />
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onComplete={handleAuthComplete}
        />
      )}

      {view === "landing" ? (
        <main className="landing">
          <div className="card-layer">
            {CARDS.map((card, i) => (
              <div
                key={i}
                className="float-card"
                style={{
                  top: card.top,
                  left: card.left,
                  background: `${card.color}30`,
                  border: `1px solid ${card.color}50`,
                  color: card.color,
                  animation: card.animation,
                }}
              >
                <CardIcon type={card.icon} />
                <span className="float-card-label" style={{ color: card.color }}>
                  {card.category}
                </span>
                <div className="float-card-lines">
                  <div className="float-card-line" style={{ background: card.color, width: "90%" }} />
                  <div className="float-card-line" style={{ background: card.color, width: "70%" }} />
                  <div className="float-card-line" style={{ background: card.color, width: "80%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="landing-content">
            <h1 className="landing-title">Docu<span style={{ color: "#2563eb" }}>Mentor</span></h1>
            <p className="landing-tagline">
              Understand your legal documents — no jargon, no stress.
            </p>
            <Waveform />
            <button
              className="landing-cta"
              onClick={handleGetStarted}
            >
              Click here to get started
            </button>
          </div>
        </main>
      ) : (
        <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb" }}>
          <Sidebar />
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
            <WorkspaceView />
          </div>
        </div>
      )}
    </>
  );
}
