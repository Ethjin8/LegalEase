"use client";

import { useEffect, useRef, useState } from "react";

type AnimPhase = "idle" | "disappear" | "done";

const IDLE_FRAMES = Array.from({ length: 36 }, (_, i) => `/animation/Untitled_Artwork-${i + 1}.png`);
const DISAPPEAR_FRAMES = Array.from({ length: 20 }, (_, i) => `/animation/disapear/Untitled_Artwork-${i + 11}.png`);
const FPS = 7;
const IDLE_LOOPS = 1;

interface Props {
  onDisappearStart?: () => void;
  onDone?: () => void;
}

export default function MascotAnimation({ onDisappearStart, onDone }: Props) {
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [frameIdx, setFrameIdx] = useState(0);
  const loopCount = useRef(0);
  const calledDisappear = useRef(false);
  const calledDone = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (phase === "idle") {
        setFrameIdx((prev) => {
          const next = prev + 1;
          if (next >= IDLE_FRAMES.length) {
            loopCount.current += 1;
            if (loopCount.current >= IDLE_LOOPS) {
              setPhase("disappear");
              return 0;
            }
            return 0;
          }
          return next;
        });
      } else if (phase === "disappear") {
        setFrameIdx((prev) => {
          const next = prev + 1;
          if (next >= DISAPPEAR_FRAMES.length) {
            setPhase("done");
            return prev;
          }
          return next;
        });
      }
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [phase, onDisappearStart]);

  useEffect(() => {
    if (phase === "disappear" && frameIdx === 9 && !calledDisappear.current) {
      calledDisappear.current = true;
      onDisappearStart?.();
    }
  }, [phase, frameIdx, onDisappearStart]);

  useEffect(() => {
    if (phase === "done" && !calledDone.current) {
      calledDone.current = true;
      onDone?.();
    }
  }, [phase, onDone]);

  if (phase === "done") return null;

  const src = phase === "idle" ? IDLE_FRAMES[frameIdx] : DISAPPEAR_FRAMES[frameIdx];

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
