import { Token } from "@proofscript/syntax";

/**
 * Decide the `:= { ... }` ambiguity for declaration bodies.
 *
 * Legacy PSC-1 used `{ term }` as a checked declaration-body block, while the
 * v0.6.1 compiler-ready reference admits expression-bodied declarations where
 * the expression may itself be a structure literal or update. This helper owns
 * only the lexical disambiguation. The chosen term is still parsed and checked
 * by the normal frontend/Core path.
 */
export function shouldParseBracedDefinitionBodyAsTerm(tokens: readonly Token[], cursorIndex: number): boolean {
  const peek = (ahead: number): Token => tokens[Math.min(cursorIndex + ahead, tokens.length - 1)];
  if (peek(0).text !== "{") return false;
  const first = peek(1);
  const second = peek(2);

  // `{ field := value, ... }` and `{ field, other }` are structure literals.
  // A single punned `{ field }` remains a legacy checked block to avoid taking
  // away existing unambiguous block-body source.
  if (first.kind === "id") {
    if (second.text === ":=" || second.text === ",") return true;
    if (second.kind === "id" && second.text === "with") return true;
    return false;
  }

  // `{ (base expression) with field := value }` is a bounded structure update.
  if (first.text !== "(") return false;
  let depth = 0;
  for (let offset = 1; offset < 64; offset++) {
    const token = peek(offset);
    if (token.kind === "eof") return false;
    if (token.text === "(" || token.text === "{" || token.text === "[") depth++;
    else if (token.text === ")" || token.text === "}" || token.text === "]") {
      depth--;
      if (depth === 0) {
        const next = peek(offset + 1);
        return next.kind === "id" && next.text === "with";
      }
      if (depth < 0) return false;
    }
  }
  return false;
}
