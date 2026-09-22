import type { CoreDeclaration } from "@proofscript/kernel";

export const RESERVED_OUTPUT_BINDINGS = new Set([
  // ECMAScript reserved words and strict-mode restricted identifiers.
  "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default",
  "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
  "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
  "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
  "yield", "let", "static", "implements", "interface", "package", "private", "protected",
  "public", "arguments", "eval",
  // Runtime/internal module bindings emitted by this backend.
  "__ps", "__proofscript", "__default",
  // CommonJS wrapper names used by Node when executing generated JavaScript.
  "exports", "require", "module", "__filename", "__dirname",
]);

export function sanitizeName(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9_$]/g, "_");
  const identifier = /^[A-Za-z_$]/.test(safe) ? safe : `_${safe}`;
  return RESERVED_OUTPUT_BINDINGS.has(identifier) ? `ps_${identifier}` : identifier;
}

export function buildSanitizedNameMap(decls: readonly CoreDeclaration[], targetName: "JavaScript" | "TypeScript"): Map<string, string> {
  const nameMap = new Map<string, string>();
  const seen = new Map<string, string>();
  for (const decl of decls) {
    const mapped = sanitizeName(decl.name);
    const prior = seen.get(mapped);
    if (prior !== undefined && prior !== decl.name) {
      throw new Error(`unsupported ${targetName} emission: sanitized name collision at '${decl.name}' -> '${mapped}'`);
    }
    seen.set(mapped, decl.name);
    nameMap.set(decl.name, mapped);
  }
  return nameMap;
}
