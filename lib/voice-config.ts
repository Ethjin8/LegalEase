/** Map display language names (from Settings) to BCP-47 codes for Gemini TTS */
export const LANGUAGE_CODES: Record<string, string> = {
  "English": "en-US",
  "Spanish (US & Mexico)": "es-US",
  "Portuguese (Brazil)": "pt-BR",
  "French (Canada)": "fr-CA",
  "Mandarin Chinese (Simplified)": "zh-CN",
  "Mandarin Chinese (Traditional)": "zh-TW",
  "Cantonese": "yue-HK",
  "Japanese": "ja-JP",
  "Korean": "ko-KR",
  "Vietnamese": "vi-VN",
  "Thai": "th-TH",
  "Filipino (Tagalog)": "fil-PH",
  "Indonesian": "id-ID",
  "Hindi": "hi-IN",
  "Bengali": "bn-IN",
  "Punjabi": "pa-IN",
  "Marathi": "mr-IN",
  "Telugu": "te-IN",
  "Tamil": "ta-IN",
  "Gujarati": "gu-IN",
  "Urdu": "ur-PK",
  "Kannada": "kn-IN",
  "Malayalam": "ml-IN",
  "French": "fr-FR",
  "German": "de-DE",
  "Italian": "it-IT",
  "Portuguese (Portugal)": "pt-PT",
  "Dutch": "nl-NL",
  "Russian": "ru-RU",
  "Ukrainian": "uk-UA",
  "Polish": "pl-PL",
  "Greek": "el-GR",
  "Swedish": "sv-SE",
  "Danish": "da-DK",
  "Norwegian": "nb-NO",
  "Finnish": "fi-FI",
  "Turkish": "tr-TR",
  "Arabic": "ar-SA",
  "Hebrew": "he-IL",
  "Swahili": "sw-KE",
  "Zulu": "zu-ZA",
  "Amharic": "am-ET",
};

export function getLanguageCode(language?: string): string {
  if (!language) return "en-US";
  return LANGUAGE_CODES[language] ?? "en-US";
}

export function getReadingLevelInstruction(level?: number): string {
  switch (level) {
    case 1: return "READING LEVEL: Simple. Use short sentences and basic vocabulary. Explain as if speaking to someone with no legal background. Avoid all jargon.";
    case 3: return "READING LEVEL: Detailed. Provide thorough explanations with relevant legal context and nuance. You may use legal terms but always define them clearly.";
    default: return "READING LEVEL: Standard. Use plain language and avoid jargon. Be clear and concise.";
  }
}

export function buildSystemPrompt(language?: string, readingLevel?: number): string {
  const lang = language && language !== "English" ? language : null;
  const levelInstruction = getReadingLevelInstruction(readingLevel);

  if (lang) {
    return `You are a friendly, patient legal document assistant for LegalEase.
The user has uploaded a legal document and wants to understand it.

CRITICAL LANGUAGE RULE: You MUST speak and respond ONLY in ${lang}. Every word you say must be in ${lang}. Do NOT use English at all — not even for greetings, transitions, or filler words. If the user speaks in any language, always reply in ${lang}.

${levelInstruction}

Speak clearly at an even pace, pausing between sentences.
Use plain, simple ${lang} — avoid legal jargon.`;
  }

  return `You are a friendly, patient legal document assistant for LegalEase.
The user has uploaded a legal document and wants to understand it.

${levelInstruction}

Speak clearly at an even pace, pausing between sentences.
If the user is a non-native English speaker, be extra clear.`;
}
