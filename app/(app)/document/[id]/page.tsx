"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DocumentDetailView from "@/components/DocumentDetailView";
import type { Document, FAQ } from "@/types";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [doc, setDoc] = useState<Document | null>(null);
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (docError || !docData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setDoc(docData);

      const { data: faqData } = await supabase
        .from("faqs")
        .select("*")
        .eq("document_id", id)
        .single();

      setFaq(faqData ?? null);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#9ca3af", fontSize: "0.9rem" }}>Loading…</div>
  );

  if (notFound) return (
    <div style={{ padding: "3rem", color: "#dc2626", fontSize: "0.9rem" }}>Document not found.</div>
  );

  return <DocumentDetailView doc={doc!} faq={faq} />;
}
