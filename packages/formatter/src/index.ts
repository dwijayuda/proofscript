import { parseSource, tokenize, tokenizeWithSpans } from "@proofscript/parser";

export interface FormatResult {
  readonly formatted: string;
  readonly changed: boolean;
  readonly tokenCount: number;
  readonly commentsPreserved: true;
}

interface CommentTrivia {
  readonly text: string;
  readonly lineComment: boolean;
  readonly lineBreakBefore: boolean;
}

interface GapTrivia {
  readonly comments: readonly CommentTrivia[];
  readonly trailingLineBreak: boolean;
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
  parseSource(source);

  const tokens = tokenizeWithSpans(source).filter((token) => token.kind !== "eof");
  let out = "";
  let previous: typeof tokens[number] | undefined;
  let previousEnd = 0;
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
  const emitTrivia = (gap: string): void => {
    const trivia = parseGapTrivia(gap);
    for (const comment of trivia.comments) {
      if (comment.lineBreakBefore || lineStart || out.length === 0) {
        if (out.length > 0) newline();
      } else {
        space();
      }
      append(comment.text);
      if (comment.lineComment) newline();
    }
    if (trivia.trailingLineBreak && trivia.comments.length > 0) newline();
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    const next = tokens[index + 1];
    emitTrivia(source.slice(previousEnd, token.offset));

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
    previousEnd = token.endOffset;
  }

  emitTrivia(source.slice(previousEnd));
  const formatted = out.trimEnd() + "\n";
  parseSource(formatted);
  assertSameTokenStream(source, formatted);
  assertSameComments(source, formatted);
  return {
    formatted,
    changed: formatted !== source,
    tokenCount: tokens.length,
    commentsPreserved: true,
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

function parseGapTrivia(gap: string): GapTrivia {
  const comments: CommentTrivia[] = [];
  let index = 0;
  let lineBreakBefore = false;

  while (index < gap.length) {
    const ch = gap[index]!;
    if (/\s/u.test(ch)) {
      if (ch === "\n" || ch === "\r") lineBreakBefore = true;
      index++;
      continue;
    }

    if (gap.startsWith("--", index)) {
      const start = index;
      index += 2;
      while (index < gap.length && gap[index] !== "\n" && gap[index] !== "\r") index++;
      comments.push({
        text: gap.slice(start, index),
        lineComment: true,
        lineBreakBefore,
      });
      lineBreakBefore = false;
      continue;
    }

    if (gap.startsWith("/-", index)) {
      const start = index;
      index += 2;
      let depth = 1;
      while (index < gap.length && depth > 0) {
        if (gap.startsWith("/-", index)) {
          depth++;
          index += 2;
        } else if (gap.startsWith("-/", index)) {
          depth--;
          index += 2;
        } else {
          index++;
        }
      }
      if (depth !== 0) throw new Error("formatter encountered unterminated block comment trivia");
      comments.push({
        text: gap.slice(start, index),
        lineComment: false,
        lineBreakBefore,
      });
      lineBreakBefore = false;
      continue;
    }

    throw new Error(`formatter encountered non-trivia source gap content ${JSON.stringify(ch)}`);
  }

  return { comments, trailingLineBreak: lineBreakBefore };
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

function assertSameComments(before: string, after: string): void {
  const comments = (source: string): string[] => {
    const tokens = tokenizeWithSpans(source);
    const out: string[] = [];
    let previousEnd = 0;
    for (const token of tokens) {
      const gap = source.slice(previousEnd, token.offset);
      out.push(...parseGapTrivia(gap).comments.map((comment) => comment.text));
      previousEnd = token.endOffset;
    }
    return out;
  };
  if (JSON.stringify(comments(before)) !== JSON.stringify(comments(after))) {
    throw new Error("formatter changed or reordered ProofScript comments");
  }
}
