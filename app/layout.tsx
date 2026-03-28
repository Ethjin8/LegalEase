import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMentor — Understand Your Legal Documents",
  description:
    "AI-powered legal document assistant for immigrants. Upload a document and ask questions in plain language.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
