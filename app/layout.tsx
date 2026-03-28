import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMentor — Understand Your Legal Documents",
  description:
    "AI-powered legal document assistant for immigrants. Upload a document and ask questions in plain language.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "#f9fafb",
        }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
