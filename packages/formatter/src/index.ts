import { parseSource, tokenize } from "@proofscript/parser";

export interface FormatResult {
  readonly formatted: string;
  readonly changed: boolean;
  readonly tokenCount: number;
  readonly commentsPreserved: false;
}

const TOP_LEVEL_STARTERS = new Set([
  "import", "universe", "namespace", "section", "open", "variable", "include", "omit",
  "def", "function", "const", "theorem", "example", "axiom", "opaque", "abbrev",
  "inductive", "structure", "class", "instance", "end",
]);

const BINARY_OPERATORS = new Set([
  ":=", "=>", "->", "→", "←", "<-", "=", "≠", "==", "!=", "<=", ">=",
  "+", "-", "*", "<", ">", "&&", "||",
]);

export function formatSource(source: string): FormatResult {
  assertTriviaSupported(source);
  parseSource(source);

  const tokens = tokenize(source).filter((token) => token.kind !== "eof");
  let out = "";
  let previous: typeof tokens[number] | undefined;
  let braceDepth = 0;
  let lineStart = true;

  const append = (text: string): void => {
    out += text;
    lineStart = text.endsWith("\n");
  };
  const space = (): void => {
    if (!lineStart && out.length > 0 && !/[ \n]$/u.test(out)) out += " ";
  };
  const newline = (): void => {
    out = out.replace(/[ \t]+$/u, "");
    if (!out.endsWith("\n")) out += "\n";
    lineStart = true;
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    const text = renderToken(token.kind, token.text);

    if (previous && needsSpace(previous.text, token.text)) space();
    append(text);

    if (token.text === "{") braceDepth++;
    if (token.text === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0 && next?.kind === "id" && TOP_LEVEL_STARTERS.has(next.text)) newline();
    }

    if (token.text === ";" && braceDepth === 0) {
      newline();
    } else if (token.text === "," || token.text === ":" || BINARY_OPERATORS.has(token.text) || token.text === "|") {
      if (next && !["}", ")", "]", ",", ";"].includes(next.text)) space();
    }

    previous = token;
  }

  const formatted = out.trimEnd() + "\n";
  parseSource(formatted);
  assertSameTokenStream(source, formatted);
  return {
    formatted,
    changed: formatted !== source,
    tokenCount: tokens.length,
    commentsPreserved: false,
  };
}


function needsSpace(previous: string, current: string): boolean {
  if ([")", "]", "}", ",", ";", ":", "."].includes(current)) return false;
  if (["(", "[", "{", ".", "@"].includes(previous)) return false;
  if (current === "(" || current === "[") return false;
  if (previous === "!") return false;
  if (current === "!") return true;
  if (BINARY_OPERATORS.has(previous) || BINARY_OPERATORS.has(current)) return true;
  if (previous === "|" || current === "|") return true;
  if (previous === "," || previous === ":") return true;
  return true;
}

function renderToken(kind: string, text: string): string {
  if (kind !== "str") return text;
  let out = '"';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\0") out += "\\0";
    else if (code < 0x20 || code === 0x7f) {
      out += code <= 0xff
        ? `\\x${code.toString(16).padStart(2, "0")}`
        : `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      out += ch;
    }
  }
  return out + '"';
}

function assertTriviaSupported(source: string): void {
  let index = 0;
  let inString = false;
  while (index < source.length) {
    const ch = source[index]!;
    if (inString) {
      if (ch === "\\") {
        index += 2;
        continue;
      }
      if (ch === '"') inString = false;
      index++;
      continue;
    }
    if (ch === '"') {
      inString = true;
      index++;
      continue;
    }
    if (source.startsWith("--", index) || source.startsWith("/-", index)) {
      throw new Error(
        "ProofScript formatter v1 refuses sources containing comments until trivia-preserving formatting is implemented",
      );
    }
    index++;
  }
}

function assertSameTokenStream(before: string, after: string): void {
  const normalize = (source: string) => tokenize(source)
    .filter((token) => token.kind !== "eof")
    .map(({ kind, text }) => ({ kind, text }));
  const left = normalize(before);
  const right = normalize(after);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error("formatter changed the canonical ProofScript token stream");
  }
}
