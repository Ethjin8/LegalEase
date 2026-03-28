"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "@/lib/gemini-live";

interface Props {
  voiceState: VoiceState;
  analyser: AnalyserNode | null;
  /** Width of the canvas — should match the container */
  width?: number;
}

const ARC_COLOR_IDLE = "#d1d5db";
const ARC_COLOR_LISTENING = "#ef4444";
const ARC_COLOR_SPEAKING = "#2563eb";
const ARC_COLOR_ACTIVE = "#2563eb";

function getArcColor(state: VoiceState): string {
  switch (state) {
    case "listening": return ARC_COLOR_LISTENING;
    case "speaking": return ARC_COLOR_SPEAKING;
    case "connecting":
    case "thinking": return ARC_COLOR_ACTIVE;
    default: return ARC_COLOR_IDLE;
  }
}

/**
 * Draws horizontal waveform bars along a curved path from the edge toward the center.
 * The curve bows downward like a planetary horizon / shallow arc.
 * Each bar's height is driven by frequency data from the analyser.
 */
export default function WaveformArcs({ voiceState, analyser, width = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const smoothBarsRef = useRef<Float32Array | null>(null);

  const H = 48; // canvas logical height
  const BAR_COUNT = 28; // bars per side
  const BAR_WIDTH = 2.5;
  const GAP = 1.5;
  const MIC_ZONE = 36; // gap in the center for the mic button

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    if (!smoothBarsRef.current || smoothBarsRef.current.length !== BAR_COUNT * 2) {
      smoothBarsRef.current = new Float32Array(BAR_COUNT * 2);
    }

    function getFrequencyBars(count: number): Float32Array {
      const bars = new Float32Array(count);
      if (!analyser) return bars;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      // Map into half the count (one side), then mirror for symmetry
      const half = count / 2;
      for (let i = 0; i < half; i++) {
        const binStart = Math.floor((i / half) * data.length);
        const binEnd = Math.floor(((i + 1) / half) * data.length);
        let sum = 0;
        for (let j = binStart; j < binEnd; j++) sum += data[j];
        const val = (sum / (binEnd - binStart || 1)) / 255;
        bars[i] = val;                   // left side
        bars[count - 1 - i] = val;       // right side (mirrored)
      }
      return bars;
    }

    function draw() {
      ctx!.clearRect(0, 0, width, H);

      const isActive = voiceState === "listening" || voiceState === "speaking";
      const color = getArcColor(voiceState);

      // Connecting: gentle pulse
      const connectPulse = voiceState === "connecting"
        ? Math.sin(Date.now() / 600) * 0.3 + 0.7
        : 1;
      const opacity = voiceState === "idle" ? 0.4 : connectPulse;

      ctx!.globalAlpha = opacity;

      // Get raw frequency data
      const rawBars = isActive ? getFrequencyBars(BAR_COUNT * 2) : new Float32Array(BAR_COUNT * 2);

      // Smooth bars for fluid animation
      const smooth = smoothBarsRef.current!;
      for (let i = 0; i < smooth.length; i++) {
        smooth[i] += (rawBars[i] - smooth[i]) * 0.18;
      }

      const centerX = width / 2;
      const baseY = H * 0.55; // baseline sits slightly below center
      const maxBarHeight = H * 0.7;

      // Curvature: bars near the edges are lower (planetary curve downward)
      // The arc bows downward — edges drop, center is highest point
      const halfSpan = centerX - MIC_ZONE / 2;

      // Draw left side bars (from center outward to left edge)
      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / (BAR_COUNT - 1); // 0 = closest to mic, 1 = at edge
        const x = centerX - MIC_ZONE / 2 - t * halfSpan;

        // Planetary curve: quadratic drop toward edges
        const curveDropoff = 1 - t * t * 0.4;
        // Bar height from audio data
        const amp = isActive ? smooth[i] : 0.08 + Math.sin(Date.now() / 1200 + i * 0.3) * 0.03;
        const barH = Math.max(2, amp * maxBarHeight * curveDropoff);

        // Thinking: converge inward
        const thinkingNudge = voiceState === "thinking"
          ? Math.sin(Date.now() / 400) * 4 * (1 - t)
          : 0;

        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.roundRect(
          x - BAR_WIDTH / 2 + thinkingNudge,
          baseY - barH / 2,
          BAR_WIDTH,
          barH,
          BAR_WIDTH / 2,
        );
        ctx!.fill();
      }

      // Draw right side bars (from center outward to right edge)
      for (let i = 0; i < BAR_COUNT; i++) {
        const t = i / (BAR_COUNT - 1);
        const x = centerX + MIC_ZONE / 2 + t * halfSpan;

        const curveDropoff = 1 - t * t * 0.4;
        const amp = isActive ? smooth[BAR_COUNT + i] : 0.08 + Math.sin(Date.now() / 1200 + i * 0.3) * 0.03;
        const barH = Math.max(2, amp * maxBarHeight * curveDropoff);

        const thinkingNudge = voiceState === "thinking"
          ? Math.sin(Date.now() / 400) * -4 * (1 - t)
          : 0;

        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.roundRect(
          x - BAR_WIDTH / 2 + thinkingNudge,
          baseY - barH / 2,
          BAR_WIDTH,
          barH,
          BAR_WIDTH / 2,
        );
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [voiceState, analyser, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: H, pointerEvents: "none" }}
    />
  );
}
