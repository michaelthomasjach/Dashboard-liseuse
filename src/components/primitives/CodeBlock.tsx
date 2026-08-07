import { useState } from "react";
import { CheckIcon, CopyIcon } from "../icons";
import "./CodeBlock.css";

export interface CodeBlockProps {
  code: string;
  /** Shown in the header when `filename` isn't set, e.g. "TypeScript". */
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

/** Monospace code snippet with a copy-to-clipboard button. No syntax highlighting on
 *  purpose — keeps the bundle self-contained instead of pulling in a highlighter. */
export function CodeBlock({ code, language, filename, showLineNumbers = false, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable or permission denied — nothing else to do.
    }
  }

  return (
    <div className={["lq-code-block", className].filter(Boolean).join(" ")}>
      <div className="lq-code-block__header">
        <span className="lq-code-block__label">{filename ?? language ?? "code"}</span>
        <button type="button" className="lq-code-block__copy" onClick={handleCopy}>
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="lq-code-block__pre">
        <code>
          {lines.map((line, i) => (
            <span key={i} className="lq-code-block__line">
              {showLineNumbers && <span className="lq-code-block__line-number">{i + 1}</span>}
              <span className="lq-code-block__line-content">{line.length > 0 ? line : " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
