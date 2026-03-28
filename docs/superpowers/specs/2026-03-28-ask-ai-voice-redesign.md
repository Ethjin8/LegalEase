# Ask AI Voice-First Redesign

## Goal

Redesign the Ask AI page to make the mic the hero element, emphasizing live agent conversations over chatbot-style text input. Text input remains available as a secondary mode.

## Layout

Two-layer vertical stack inside a fixed-height container:

- **Top layer (transcript):** Minimal by default in voice mode (last exchange only). Expandable to full scrollable chat. Auto-expanded in text mode.
- **Bottom layer (hero mic):** Large centered mic button (64px) flanked by two curved parenthesis-shaped SVG arcs. "Switch to text" link below.

In text mode, the mic area slides out and is replaced by a text input bar. "Switch to voice" link allows switching back. Both modes share the same message history.

## Modes

- `voice` (default): Hero mic + minimal transcript
- `text`: Expanded chat + text input bar

Switching preserves full conversation history.

## Voice States & Arc Animations

| State | Mic Button | Arcs |
|-------|-----------|------|
| Idle | Gray (#f3f4f6) | Static, subtle gray (#d1d5db) |
| Connecting | Amber (#fef3c7) | Gentle fade-pulse |
| Listening | Red (#fee2e2), pulse animation | Waveform reacting to mic input amplitude |
| Thinking | Neutral | Converging inward animation |
| Speaking | Blue (#dbeafe) | Ripple outward, reacting to audio output amplitude |

## Waveform Reactivity

- Use Web Audio API `AnalyserNode` for real-time amplitude data
- Listening: analyser on mic input stream
- Speaking: analyser on audio playback stream
- Amplitude drives scale/displacement of the SVG arc paths
- Fallback: CSS animation approximation if analyser unavailable

## Minimal Transcript (Voice Mode)

- Last exchange only (one user line, one AI line)
- Truncated to ~2 lines each
- "View conversation" button expands to full chat with existing bubble styling
- "Hide conversation" collapses back

## Text Mode

- "Switch to text" slides mic out, fades in text input bar
- Transcript auto-expands
- Input bar: same styling as current (input + Send button)
- "Switch to voice" link to return

## Files

- `components/VoiceChat.tsx` — Full rewrite with new layout, modes, animations
- `components/WaveformArcs.tsx` — Extracted SVG arc component if VoiceChat gets large
- No `globals.css` changes needed
