import { ProofScriptError } from "./errors.js";
import type { Token } from "./model.js";

const singlePunctuation = new Set(["(", ")", ":", ",", "=", "+", "-", "*", "<", ">", "{", "}", "[", "]", "⦃", "⦄", "|", ";", ".", "→", "∀", "∃", "↦", "@", "↑", "?", "←", "≤", "≥"]);

export function lex(source: string): readonly Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i]!;

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    // Canonical Lean/ProofScript line comments. `//` is intentionally not a comment.
    if (char === "-" && source[i + 1] === "-") {
      i += 2;
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    // Lean block comments nest.
    if (char === "/" && source[i + 1] === "-") {
      i += 2;
      let depth = 1;
      while (i < source.length && depth > 0) {
        if (source[i] === "/" && source[i + 1] === "-") {
          depth += 1;
          i += 2;
          continue;
        }
        if (source[i] === "-" && source[i + 1] === "/") {
          depth -= 1;
          i += 2;
          continue;
        }
        i += 1;
      }
      if (depth !== 0) throw new ProofScriptError("PS0102", "Unterminated nested block comment.");
      continue;
    }

    if (char === '"') {
      const start = i;
      i += 1;
      let closed = false;
      while (i < source.length) {
        const c = source[i]!;
        if (c === "\n" || c === "\r") {
          throw new ProofScriptError("PS0103", `Unterminated string literal at offset ${start}.`);
        }
        if (c === "\\") {
          const esc = source[i + 1];
          if (esc === undefined) break;
          if (esc === "\\" || esc === '"' || esc === "'" || esc === "r" || esc === "n" || esc === "t") {
            i += 2;
            continue;
          }
          const width = esc === "x" ? 2 : esc === "u" ? 4 : 0;
          if (width > 0) {
            const digits = source.slice(i + 2, i + 2 + width);
            if (digits.length !== width || !/^[0-9A-Fa-f]+$/.test(digits)) {
              throw new ProofScriptError("PS0104", `Invalid Lean String hexadecimal escape at offset ${i}.`);
            }
            i += 2 + width;
            continue;
          }
          if (esc === "\n" || esc === "\r") {
            throw new ProofScriptError("PS0105", "Lean String gaps are not implemented in the v0.57 portable String-literal slice.");
          }
          throw new ProofScriptError("PS0104", `Invalid Lean String escape '\\${esc}' at offset ${i}.`);
        }
        if (c === '"') { i += 1; closed = true; break; }
        i += 1;
      }
      if (!closed) throw new ProofScriptError("PS0103", `Unterminated string literal at offset ${start}.`);
      tokens.push({ kind: "string", text: source.slice(start, i), offset: start });
      continue;
    }

    const pair = source.slice(i, i + 2);
    if (pair === "::" || pair === "=>" || pair === "==" || pair === "++" || pair === ":=" || pair === "->" || pair === "<-" || pair === "<=" || pair === ">=") {
      tokens.push({ kind: "punct", text: pair, offset: i });
      i += 2;
      continue;
    }

    if (singlePunctuation.has(char)) {
      tokens.push({ kind: "punct", text: char, offset: i });
      i += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i]!)) i += 1;
      tokens.push({ kind: "number", text: source.slice(start, i), offset: start });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = i;
      i += 1;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i]!)) i += 1;
      tokens.push({ kind: "identifier", text: source.slice(start, i), offset: start });
      continue;
    }

    throw new ProofScriptError("PS0101", `Unexpected character '${char}' at offset ${i}.`);
  }

  tokens.push({ kind: "eof", text: "<eof>", offset: source.length });
  return tokens;
}
