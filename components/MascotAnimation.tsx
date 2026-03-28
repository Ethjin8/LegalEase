"use client";

import { useEffect, useRef, useState } from "react";

type AnimPhase = "appear" | "idle";

const IDLE_FRAMES = Array.from({ length: 36 }, (_, i) => `/animation/Untitled_Artwork-${i + 1}.png`);
const DISAPPEAR_FRAMES = Array.from({ length: 20 }, (_, i) => `/animation/disapear/Untitled_Artwork-${i + 11}.png`);
const APPEAR_FRAMES = [...DISAPPEAR_FRAMES].reverse();
const FPS = 7;

interface Props {
  onAppearMidpoint?: () => void;
}

export default function MascotAnimation({ onAppearMidpoint }: Props) {
  const [phase, setPhase] = useState<AnimPhase>("appear");
  const [frameIdx, setFrameIdx] = useState(0);
  const calledMidpoint = useRef(false);
  const cbRef = useRef({ onAppearMidpoint });
  cbRef.current = { onAppearMidpoint };

  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === "appear") {
        setFrameIdx((prev) => {
          const next = prev + 1;
          if (next >= APPEAR_FRAMES.length) {
            setPhase("idle");
            return 0;
          }
          return next;
        });
      } else if (phase === "idle") {
        setFrameIdx((prev) => (prev + 1) % IDLE_FRAMES.length);
      }
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "appear" && frameIdx === 9 && !calledMidpoint.current) {
      calledMidpoint.current = true;
      cbRef.current.onAppearMidpoint?.();
    }
  }, [phase, frameIdx]);

  const src = phase === "appear" ? APPEAR_FRAMES[frameIdx] : IDLE_FRAMES[frameIdx];

  return (
    <img
      src={src}
      alt=""
      style={{
        height: "60px",
        width: "60px",
        objectFit: "contain",
        objectPosition: "center",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
