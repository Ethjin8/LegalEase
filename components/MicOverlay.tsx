"use client";

import type { VoiceState } from "@/lib/gemini-live";

interface Props {
  voiceState: VoiceState;
  onToggle: () => void;
}

export default function MicOverlay({ voiceState, onToggle }: Props) {
  const MIC_SIZE = 58;
  const CURVE_H = 52;          // Y where curve starts at left/right edges
  const BAR_H = 44;            // solid area below the curve
  const TOTAL_H = CURVE_H + BAR_H;
  const MIC_CENTER_Y = CURVE_H / 2;                // curve peak = mic center
  const MIC_TOP = MIC_CENTER_Y - MIC_SIZE / 2;     // mic pokes above container
  const LABEL_TOP = MIC_CENTER_Y + MIC_SIZE / 2 + 10; // comfortable gap below mic

  const isActive = voiceState !== "idle";

  const micBg =
    voiceState === "idle"
      ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
      : voiceState === "connecting"
        ? "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)"
        : voiceState === "listening"
          ? "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)"
          : voiceState === "speaking"
            ? "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
            : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)";

  const stateLabel =
    voiceState === "connecting" ? "Connecting..."
      : voiceState === "listening" ? "Listening..."
        : voiceState === "thinking" ? "Thinking..."
          : voiceState === "speaking" ? "Speaking..."
            : null;

  const pulseColor =
    voiceState === "listening" ? "rgba(239, 68, 68, 0.4)"
      : voiceState === "speaking" ? "rgba(37, 99, 235, 0.35)"
        : voiceState === "connecting" ? "rgba(245, 158, 11, 0.35)"
          : "transparent";

  // Bezier control Y = 0 makes peak at CURVE_H/2 = mic center
  const curvePathD = `M0,${CURVE_H} Q500,0 1000,${CURVE_H} L1000,${TOTAL_H} L0,${TOTAL_H} Z`;
  const curveStrokeD = `M0,${CURVE_H} Q500,0 1000,${CURVE_H}`;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 280,
        right: 0,
        height: TOTAL_H,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      {/* Curved background shape */}
      <svg
        viewBox={`0 0 1000 ${TOTAL_H}`}
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "drop-shadow(0 -4px 14px rgba(0,0,0,0.1))",
        }}
      >
        <defs>
          <linearGradient id="curve-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(206,212,226,0.93)" />
            <stop offset="100%" stopColor="rgba(196,203,220,0.97)" />
          </linearGradient>
        </defs>
        <path d={curvePathD} fill="url(#curve-grad)" />
        <path
          d={curveStrokeD}
          fill="none"
          stroke="rgba(180,188,208,0.7)"
          strokeWidth="1"
        />
      </svg>

      {/* Backdrop blur layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          clipPath: `path('${curvePathD}')`,
        }}
      />

      {/* Pulse rings */}
      {isActive && (
        <>
          <div
            style={{
              position: "absolute",
              top: MIC_TOP,
              left: "50%",
              transform: "translateX(-50%)",
              width: MIC_SIZE,
              height: MIC_SIZE,
              borderRadius: "50%",
              zIndex: 1,
              animation: "mic-ring-1 2s ease-out infinite",
              border: `2px solid ${pulseColor}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: MIC_TOP,
              left: "50%",
              transform: "translateX(-50%)",
              width: MIC_SIZE,
              height: MIC_SIZE,
              borderRadius: "50%",
              zIndex: 1,
              animation: "mic-ring-2 2s ease-out 0.6s infinite",
              border: `2px solid ${pulseColor}`,
            }}
          />
        </>
      )}

      {/* Mic button */}
      <button
        onClick={onToggle}
        title={isActive ? "Stop voice chat" : "Talk to your document"}
        style={{
          position: "absolute",
          top: MIC_TOP,
          left: "50%",
          transform: "translateX(-50%)",
          width: MIC_SIZE,
          height: MIC_SIZE,
          borderRadius: "50%",
          border: "none",
          background: micBg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: isActive
            ? `0 6px 24px ${pulseColor}, 0 2px 8px rgba(0,0,0,0.12)`
            : "0 4px 16px rgba(37, 99, 235, 0.3), 0 2px 6px rgba(0,0,0,0.1)",
          zIndex: 2,
          pointerEvents: "auto",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1)";
        }}
      >
        {voiceState === "idle" ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        )}
      </button>

      {/* State label — snug below mic */}
      <div
        style={{
          position: "absolute",
          top: LABEL_TOP,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {stateLabel ? (
          <span style={{
            fontSize: "0.72rem",
            color: "#4b5563",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.03em",
          }}>
            {stateLabel}
          </span>
        ) : (
          <span style={{
            fontSize: "0.7rem",
            color: "#6b7280",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
          }}>
            Tap to talk
          </span>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes mic-ring-1 {
          0% { transform: translateX(-50%) scale(1); opacity: 0.6; }
          100% { transform: translateX(-50%) scale(1.8); opacity: 0; }
        }
        @keyframes mic-ring-2 {
          0% { transform: translateX(-50%) scale(1); opacity: 0.5; }
          100% { transform: translateX(-50%) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
