"use client";

import { useRef, useState } from "react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { FAQ } from "@/types";

interface Props {
  faq: FAQ | null;
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div
      style={{
        borderWidth: "1.5px",
        borderStyle: "solid",
        borderColor: isOpen ? "#bfdbfe" : "#e5e7eb",
        borderRadius: 10,
        overflow: "hidden",
        background: "#fff",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem 1.25rem",
          background: isOpen ? "#f0f9ff" : "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          transition: "background 0.2s",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          fontSize: "0.95rem",
          color: isOpen ? "#1d4ed8" : "#1a1a2e",
        }}
      >
        {question}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: isOpen ? "#dbeafe" : "#f3f4f6",
            color: isOpen ? "#2563eb" : "#6b7280",
            fontSize: "1rem",
            lineHeight: 1,
            paddingBottom: 1,
            flexShrink: 0,
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease, background 0.2s, color 0.2s",
          }}
        >
          +
        </span>
      </button>

      <div
        ref={bodyRef}
        style={{
          maxHeight: isOpen ? (bodyRef.current?.scrollHeight ?? 600) + "px" : "0px",
          opacity: isOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.32s ease, opacity 0.25s ease",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1.25rem 1.1rem",
            borderTop: "1.5px solid #e5e7eb",
            fontFamily: "'Merriweather', serif",
            fontSize: "0.875rem",
            color: "#374151",
            lineHeight: 1.8,
          }}
        >
          <MarkdownRenderer>{answer}</MarkdownRenderer>
        </div>
      </div>
    </div>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: "0.75rem",
    fontFamily: "'Inter', sans-serif",
  }}>
    {children}
  </p>
);

export default function FAQPanel({ faq }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  if (!faq) {
    return (
      <div style={{ padding: "1.5rem", background: "#f9fafb", borderRadius: 10 }}>
        <p style={{ color: "#6b7280", fontFamily: "'Inter', sans-serif" }}>
          No FAQ available for this document.
        </p>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Summary */}
      <div
        style={{
          background: "#eff6ff",
          borderRadius: 10,
          padding: "1.25rem 1.5rem",
          borderLeft: "4px solid #2563eb",
        }}
      >
        <SectionLabel>Summary</SectionLabel>
        <p style={{
          color: "#1e3a5f",
          lineHeight: 1.8,
          fontFamily: "'Merriweather', serif",
          fontSize: "0.9rem",
        }}>
          {faq.summary}
        </p>
      </div>

      {/* Key dates + Obligations side by side if both exist, else stacked */}
      {(faq.key_dates.length > 0 || faq.obligations.length > 0) && (
        <div style={{
          display: "grid",
          gridTemplateColumns: faq.key_dates.length > 0 && faq.obligations.length > 0 ? "1fr 1fr" : "1fr",
          gap: "1rem",
        }}>
          {faq.key_dates.length > 0 && (
            <div style={{
              background: "#fafafa",
              border: "1.5px solid #e5e7eb",
              borderRadius: 10,
              padding: "1rem 1.25rem",
            }}>
              <SectionLabel>Key Dates</SectionLabel>
              <ul style={{ paddingLeft: "1.1rem", color: "#374151", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {faq.key_dates.map((d, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", lineHeight: 1.6 }}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {faq.obligations.length > 0 && (
            <div style={{
              background: "#fafafa",
              border: "1.5px solid #e5e7eb",
              borderRadius: 10,
              padding: "1rem 1.25rem",
            }}>
              <SectionLabel>Your Obligations</SectionLabel>
              <ul style={{ paddingLeft: "1.1rem", color: "#374151", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {faq.obligations.map((o, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", lineHeight: 1.6 }}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Accordion */}
      <div>
        <SectionLabel>Frequently Asked Questions</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {faq.items.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
