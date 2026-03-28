"use client";

import { useState } from "react";

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

const READING_LEVELS = [
  "Simple",
  "Standard",
  "Detailed",
];

type Mode = "login" | "signup";
type SignupStep = "credentials" | "preferences";

interface AuthModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function AuthModal({ onClose, onComplete }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>("credentials");

  // Form fields (UI only)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [readingLevel, setReadingLevel] = useState(1); // 0=Simple, 1=Standard, 2=Detailed

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    onComplete();
  }

  function handleSignupNext(e: React.FormEvent) {
    e.preventDefault();
    setSignupStep("preferences");
  }

  function handleSignupFinish() {
    onComplete();
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setSignupStep("credentials");
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="auth-title">
          {mode === "login"
            ? "Welcome back"
            : signupStep === "credentials"
            ? "Create your account"
            : "Your preferences"}
        </h2>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Sign in to access your documents"
            : signupStep === "credentials"
            ? "Get started with DocuMentor"
            : "Help us tailor your experience"}
        </p>

        {/* ── Login Form ── */}
        {mode === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            <button className="auth-submit" type="submit">Sign in</button>
            <div className="auth-switch">
              Don&apos;t have an account?{" "}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode("signup")}>
                Sign up
              </button>
            </div>
          </form>
        )}

        {/* ── Signup: Credentials Step ── */}
        {mode === "signup" && signupStep === "credentials" && (
          <form className="auth-form" onSubmit={handleSignupNext}>
            <label className="auth-label">
              Name
              <input
                className="auth-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
              />
            </label>
            <button className="auth-submit" type="submit">Continue</button>
            <div className="auth-switch">
              Already have an account?{" "}
              <button type="button" className="auth-switch-btn" onClick={() => switchMode("login")}>
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* ── Signup: Preferences Step ── */}
        {mode === "signup" && signupStep === "preferences" && (
          <div className="auth-form">
            <label className="auth-label">
              Preferred language
              <span className="auth-hint">Documents and responses will be translated for you</span>
              <select
                className="auth-select"
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

            <label className="auth-label">
              Reading level
              <span className="auth-hint">How detailed should explanations be?</span>
              <div className="auth-slider-wrapper">
                <input
                  className="auth-slider"
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={readingLevel}
                  onChange={(e) => setReadingLevel(Number(e.target.value))}
                />
                <div className="auth-slider-labels">
                  {READING_LEVELS.map((label, i) => (
                    <span
                      key={label}
                      className={`auth-slider-label${readingLevel === i ? " active" : ""}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </label>

            <div className="auth-pref-actions">
              <button
                type="button"
                className="auth-back"
                onClick={() => setSignupStep("credentials")}
              >
                Back
              </button>
              <button
                type="button"
                className="auth-submit"
                onClick={handleSignupFinish}
              >
                Get started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
