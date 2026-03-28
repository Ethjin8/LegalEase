"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReadingLevel } from "@/types";

const LANGUAGE_GROUPS: { region: string; languages: string[] }[] = [
  {
    region: "Americas",
    languages: ["English", "Spanish (US & Mexico)", "Portuguese (Brazil)", "French (Canada)"],
  },
  {
    region: "Asia-Pacific",
    languages: [
      "Mandarin Chinese (Simplified)", "Mandarin Chinese (Traditional)", "Cantonese",
      "Japanese", "Korean", "Vietnamese", "Thai", "Filipino (Tagalog)", "Indonesian",
    ],
  },
  {
    region: "South Asia",
    languages: [
      "Hindi", "Bengali", "Punjabi", "Marathi", "Telugu", "Tamil",
      "Gujarati", "Urdu", "Kannada", "Malayalam",
    ],
  },
  {
    region: "Europe",
    languages: [
      "French", "German", "Italian", "Portuguese (Portugal)", "Dutch", "Russian",
      "Ukrainian", "Polish", "Greek", "Swedish", "Danish", "Norwegian", "Finnish", "Turkish",
    ],
  },
  {
    region: "Middle East & Africa",
    languages: ["Arabic", "Hebrew", "Swahili", "Zulu", "Amharic"],
  },
];

const READING_LEVELS = ["Simple", "Standard", "Detailed"];

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  fontSize: "0.9rem",
  border: "1.5px solid #e5e7eb",
  borderRadius: 9,
  outline: "none",
  color: "#1a1a2e",
  background: "#fafafa",
};

const selectStyle: React.CSSProperties = {
  padding: "0.65rem 2.25rem 0.65rem 0.85rem",
  fontSize: "0.9rem",
  border: "1.5px solid #e5e7eb",
  borderRadius: 9,
  outline: "none",
  color: "#1a1a2e",
  background: "#fafafa",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
};

export default function SettingsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("English");
  const [readingLevel, setReadingLevel] = useState<ReadingLevel>(2);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, region, reading_level")
        .eq("id", user.id)
        .single();

      setEmail(user.email ?? "");
      if (profile) {
        setName(profile.name ?? "");
        setRegion(profile.region ?? "");
        setReadingLevel((profile.reading_level ?? 2) as ReadingLevel);
      }

      const lang = user.user_metadata?.language;
      if (lang) setLanguage(lang);

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setSaving(false); return; }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name, region, reading_level: readingLevel })
      .eq("id", user.id);

    const { error: metaError } = await supabase.auth.updateUser({
      data: { language },
    });

    setSaving(false);

    if (profileError || metaError) {
      setError(profileError?.message ?? metaError?.message ?? "Save failed.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#6b7280" }}>Loading…</main>;
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.35rem", color: "#1a1a2e" }}>
        Settings
      </h1>
      <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "2rem" }}>
        Update your account and preferences.
      </p>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>

        {/* Account */}
        <section>
          <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "0.85rem" }}>
            Account
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label style={labelStyle}>
              Name
              <input
                style={inputStyle}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label style={labelStyle}>
              Email
              <input
                style={{ ...inputStyle, background: "#f3f4f6", color: "#9ca3af", cursor: "not-allowed" }}
                type="email"
                value={email}
                disabled
              />
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400 }}>Email cannot be changed here.</span>
            </label>
          </div>
        </section>

        <hr style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />

        {/* Preferences */}
        <section>
          <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "0.85rem" }}>
            Preferences
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <label style={labelStyle}>
              Preferred language
              <select
                style={selectStyle}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGE_GROUPS.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Region
              <input
                style={inputStyle}
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. California, USA"
              />
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400 }}>
                Laws vary by location — helps us give accurate guidance.
              </span>
            </label>

            <label style={labelStyle}>
              Reading level
              <div style={{ marginTop: "0.35rem" }}>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={readingLevel}
                  onChange={(e) => setReadingLevel(Number(e.target.value) as ReadingLevel)}
                  className="auth-slider"
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
                  {READING_LEVELS.map((label, i) => (
                    <span
                      key={label}
                      style={{
                        fontSize: "0.78rem",
                        color: readingLevel === i + 1 ? "#2563eb" : "#9ca3af",
                        fontWeight: readingLevel === i + 1 ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </label>
          </div>
        </section>

        {error && (
          <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.8rem",
            borderRadius: 10,
            border: "none",
            background: saved ? "#16a34a" : "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: saving ? "wait" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
