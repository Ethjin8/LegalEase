"use client";

// Lightweight markdown renderer — no external deps.
// Handles: **bold**, *italic*, `code`, bullet lists, numbered lists, line breaks.

interface Props {
  children: string;
  style?: React.CSSProperties;
}

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Combined regex: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));

    if (match[2]) {
      parts.push(<strong key={key++} style={{ fontWeight: 700 }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} style={{ background: "#f3f4f6", borderRadius: 4, padding: "0.1em 0.35em", fontSize: "0.85em", fontFamily: "monospace" }}>
          {match[4]}
        </code>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function MarkdownRenderer({ children, style }: Props) {
  const lines = children.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Bullet list (- or *)
    if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].replace(/^[-*] /, ""))}</li>);
        i++;
      }
      elements.push(<ul key={key++} style={{ paddingLeft: "1.25rem", marginBottom: "0.5rem" }}>{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      elements.push(<ol key={key++} style={{ paddingLeft: "1.25rem", marginBottom: "0.5rem" }}>{items}</ol>);
      continue;
    }

    // Heading ## or ###
    if (/^#{1,3} /.test(line)) {
      const level = (line.match(/^(#+)/) ?? ["#"])[0].length;
      const text = line.replace(/^#+\s/, "");
      const sizes = ["1.1rem", "1rem", "0.95rem"];
      elements.push(
        <p key={key++} style={{ fontWeight: 700, fontSize: sizes[Math.min(level - 1, 2)], marginBottom: "0.35rem" }}>
          {parseInline(text)}
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} style={{ marginBottom: "0.5rem", lineHeight: 1.8 }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div style={style}>{elements}</div>;
}
