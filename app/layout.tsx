import type { Metadata } from "next";
import "./globals.css";
import TransitionReveal from "@/components/TransitionReveal";

export const metadata: Metadata = {
  title: "LegalEase — Understand Your Legal Documents",
  description:
    "AI-powered legal document assistant for immigrants. Upload a document and ask questions in plain language.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <TransitionReveal />
        {children}
      </body>
    </html>
  );
}
