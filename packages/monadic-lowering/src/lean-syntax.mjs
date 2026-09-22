const LEAN_RESERVED_IDENTIFIERS = new Set([
  "abbrev", "axiom", "by", "class", "def", "deriving", "do", "else", "end",
  "example", "export", "extends", "for", "forall", "from", "fun", "if", "import",
  "in", "include", "inductive", "infix", "infixl", "infixr", "instance", "let",
  "macro", "match", "namespace", "notation", "omit", "open", "opaque", "partial",
  "precedence", "private", "protected", "return", "section", "structure", "syntax",
  "theorem", "then", "universe", "universes", "variable", "variables", "where",
  "with",
]);

function sanitizeIdentifierText(name, fallback = "x") {
  const raw = String(name ?? fallback);
  const sanitized = raw
    .replace(/[^A-Za-z0-9_']/g, "_")
    .replace(/^([0-9])/, "_$1");
  return sanitized || fallback;
}

export function leanIdentifier(name, { quoteReserved = true } = {}) {
  const sanitized = sanitizeIdentifierText(name);
  if (quoteReserved && LEAN_RESERVED_IDENTIFIERS.has(sanitized)) {
    return `«${sanitized}»`;
  }
  return sanitized;
}

export function leanPath(name) {
  return String(name ?? "")
    .split(".")
    .filter(Boolean)
    .map(segment => leanIdentifier(segment))
    .join(".");
}

export function leanGeneratedIdentifier(name, suffix = "") {
  const base = sanitizeIdentifierText(name);
  const combined = sanitizeIdentifierText(`${base}${suffix}`);
  return LEAN_RESERVED_IDENTIFIERS.has(combined) ? `ps_${combined}` : combined;
}

export function leanParameterBinders(params) {
  return (params ?? [])
    .map(param => `(${leanIdentifier(param.name)} : ${param.type})`)
    .join(" ");
}
