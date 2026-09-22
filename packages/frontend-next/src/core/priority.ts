import { ProofScriptError } from "./errors.js";
import type { ParserCursor } from "./plugin-api.js";

const NAMED_PRIORITIES: Readonly<Record<string, number>> = {
  low: 100,
  mid: 500,
  default: 1000,
  high: 10000,
};

function parseAtom(cursor: ParserCursor, code: string): number {
  if (cursor.peek("(")) {
    cursor.consume("(");
    const value = parsePriority(cursor, code);
    cursor.expect(")");
    return value;
  }
  const token = cursor.consume();
  if (/^[0-9]+$/.test(token)) return Number(token);
  const named = NAMED_PRIORITIES[token];
  if (named !== undefined) return named;
  throw new ProofScriptError(code, `Expected a Lean priority expression (numeral, low, mid, default, or high), found '${token}'.`);
}

/** Parse Lean's small priority-expression language: atoms plus left-associative
 * `+` / `-`. Priorities are natural-number-like, so subtraction saturates at 0. */
export function parsePriority(cursor: ParserCursor, code: string): number {
  let value = parseAtom(cursor, code);
  while (cursor.peek("+") || cursor.peek("-")) {
    const op = cursor.consume();
    const rhs = parseAtom(cursor, code);
    value = op === "+" ? value + rhs : Math.max(0, value - rhs);
  }
  if (!Number.isSafeInteger(value) || value < 0) throw new ProofScriptError(code, `Priority '${value}' is outside the supported safe integer range.`);
  return value;
}
