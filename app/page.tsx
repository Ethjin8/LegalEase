"use client";

import { useRouter } from "next/navigation";

const CARDS = [
  {
    category: "Immigration",
    color: "#3B82F6",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      </svg>
    ),
    top: "8%",
    left: "6%",
    animation: "drift0 38s ease-in-out infinite",
  },
  {
    category: "Housing",
    color: "#6DAB7B",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    top: "15%",
    left: "78%",
    animation: "drift1 42s ease-in-out infinite",
  },
  {
    category: "Employment",
    color: "#D4A056",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    top: "55%",
    left: "4%",
    animation: "drift2 35s ease-in-out infinite",
  },
  {
    category: "Financial",
    color: "#E8C547",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    top: "70%",
    left: "82%",
    animation: "drift3 46s ease-in-out infinite",
  },
  {
    category: "Benefits",
    color: "#E88B9C",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    top: "35%",
    left: "88%",
    animation: "drift4 40s ease-in-out infinite",
  },
  {
    category: "Legal",
    color: "#5B8A9A",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="3" x2="12" y2="15" />
        <path d="M5 12l7-9 7 9" />
        <path d="M5 12a7 7 0 0 0 14 0" />
        <line x1="2" y1="21" x2="22" y2="21" />
      </svg>
    ),
    top: "78%",
    left: "22%",
    animation: "drift5 44s ease-in-out infinite",
  },
  // Duplicates for visual density
  {
    category: "Immigration",
    color: "#3B82F6",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      </svg>
    ),
    top: "42%",
    left: "30%",
    animation: "drift6 36s ease-in-out infinite",
  },
  {
    category: "Housing",
    color: "#6DAB7B",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    top: "12%",
    left: "50%",
    animation: "drift7 48s ease-in-out infinite",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="landing">
      {/* Floating document cards */}
      <div className="card-layer">
        {CARDS.map((card, i) => (
          <div
            key={i}
            className="float-card"
            style={{
              top: card.top,
              left: card.left,
              background: `${card.color}10`,
              border: `1px solid ${card.color}26`,
              color: card.color,
              animation: card.animation,
            }}
          >
            {card.icon}
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

      {/* Center content */}
      <div className="landing-content">
        <h1 className="landing-title">DocuMentor</h1>
        <p className="landing-tagline">
          Understand your legal documents — no jargon, no stress.
        </p>
        <button
          className="landing-cta"
          onClick={() => router.push("/upload")}
        >
          Click here to get started
        </button>
      </div>
    </main>
  );
}
