import { ProofScriptError } from "./errors.js";
import type { ParserCursor } from "./plugin-api.js";
import type { BinderInfo, SurfaceParam } from "./model.js";

interface BinderDelimiters {
  readonly open: string;
  readonly close: string;
  readonly binderInfo: BinderInfo;
}

const DELIMITERS: readonly BinderDelimiters[] = [
  { open: "(", close: ")", binderInfo: "explicit" },
  { open: "{", close: "}", binderInfo: "implicit" },
  { open: "⦃", close: "⦄", binderInfo: "strictImplicit" },
  { open: "[", close: "]", binderInfo: "instance" },
];

/**
 * Parse the reference's four binder classes for the currently implemented
 * named-binder slice. This deliberately keeps binder information in the
 * surface/IR instead of normalizing everything to explicit parameters.
 */
export function parseBinderGroups(cursor: ParserCursor, options: { readonly allowDefaults?: boolean; readonly stopBeforeBodyBrace?: boolean } = {}): SurfaceParam[] {
  const result: SurfaceParam[] = [];
  while (true) {
    const delimiters = DELIMITERS.find((item) => cursor.peek(item.open));
    if (!delimiters) break;
    if (options.stopBeforeBodyBrace && delimiters.open === "{") break;
    // `{` is also the declaration-body delimiter. Treat it as an implicit
    // binder only when the immediate named-binder shape `{name: ...}` is present.
    if (delimiters.open === "{" && !cursor.peekAhead(2, ":")) break;
    cursor.consume(delimiters.open);
    if (cursor.peek(delimiters.close)) {
      throw new ProofScriptError("PS0210", `Empty '${delimiters.open}${delimiters.close}' binder group is not standard ProofScript.`);
    }

    if (delimiters.binderInfo === "instance") {
      if (cursor.peekAhead(1, ":")) {
        const name = cursor.parseIdentifier();
        cursor.consume(":");
        const type = cursor.parseTypeExpression();
        cursor.expect(delimiters.close);
        result.push({ name, type, binderInfo: delimiters.binderInfo });
      } else {
        const type = cursor.parseTypeExpression();
        cursor.expect(delimiters.close);
        result.push({ name: `_inst${result.length + 1}`, type, binderInfo: delimiters.binderInfo });
      }
      continue;
    }

    while (true) {
      const name = cursor.parseIdentifier();
      cursor.expect(":");
      const type = cursor.parseTypeExpression();
      let defaultValue;
      if (cursor.peek(":=")) {
        if (!options.allowDefaults) {
          throw new ProofScriptError("PS0223", "Optional/default binders are not enabled in this syntax category; v0.10 implements them for declaration binders only.");
        }
        if (delimiters.binderInfo !== "explicit") {
          throw new ProofScriptError("PS0219", "Optional/default parameters are supported only for explicit '(x: A := d)' binders in the v0.10 reference slice.");
        }
        cursor.consume(":=");
        defaultValue = cursor.parseExpression();
      }
      result.push({ name, type, binderInfo: delimiters.binderInfo, ...(defaultValue ? { defaultValue } : {}) });
      if (cursor.peek(",")) {
        cursor.consume(",");
        if (cursor.peek(delimiters.close)) break;
        continue;
      }
      break;
    }
    cursor.expect(delimiters.close);
  }
  return result;
}

export function binderOpen(info: BinderInfo): string {
  switch (info) {
    case "explicit": return "(";
    case "implicit": return "{";
    case "strictImplicit": return "⦃";
    case "instance": return "[";
  }
}

export function binderClose(info: BinderInfo): string {
  switch (info) {
    case "explicit": return ")";
    case "implicit": return "}";
    case "strictImplicit": return "⦄";
    case "instance": return "]";
  }
}
