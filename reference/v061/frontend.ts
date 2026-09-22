export type ReferenceFeatureId =
  | "D-CALL"
  | "D-EXPLICIT-PARAMS"
  | "D-DECL-SEMI"
  | "D-CONST-ALIAS"
  | "D-FUNCTION-ALIAS"
  | "E-IF-BRACE"
  | "E-STRUCT-BODY"
  | "E-CLASS-BODY"
  | "E-INDUCTIVE-BODY"
  | "E-MATCH-BODY"
  | "E-WHERE-BODY";

export type ReferenceErrorCode =
  | "PS_UNKNOWN_FEATURE"
  | "PS_UNREGISTERED_EXCEPTION"
  | "PS_AMBIGUOUS_OWNERSHIP"
  | "PS_CONST_WITH_PARAMS"
  | "PS_FUNCTION_WITHOUT_PARAMS"
  | "PS_IF_REQUIRES_PARENS"
  | "PS_BRANCH_REQUIRES_SINGLE_TERM"
  | "PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED"
  | "PS_TYPESCRIPT_GENERICS_NOT_ADMITTED"
  | "PS_RETURN_NOT_ADMITTED"
  | "PS_GLOBAL_BLOCK_NOT_ADMITTED"
  | "PS_VERSION_MISMATCH"
  | "PS_REFERENCE_PARSE_ERROR";

export interface ReferenceNode {
  readonly kind:
    | "constAlias"
    | "functionAlias"
    | "definition"
    | "call"
    | "ifBrace"
    | "structure"
    | "class"
    | "inductive"
    | "match"
    | "whereDefinition";
  readonly source: string;
}

export type ReferenceDecision =
  | { readonly kind: "proofscript"; readonly feature: ReferenceFeatureId; readonly node: ReferenceNode }
  | { readonly kind: "defer" }
  | { readonly kind: "error"; readonly code: ReferenceErrorCode; readonly message: string };

export interface ReferenceLoweringResult {
  readonly leanText: string;
  readonly relation: "SyntaxEq";
  readonly featureIds: readonly ReferenceFeatureId[];
  readonly sourceMapStatus: "synthetic-only";
}

class ReferenceSyntaxError extends Error {
  constructor(readonly code: ReferenceErrorCode, message: string) {
    super(message);
    this.name = "ReferenceSyntaxError";
  }
}

export function referenceParse(source: string): ReferenceDecision {
  try {
    const trimmed = source.trim();
    rejectRegisteredNegativeForms(trimmed);
    const classified = classifyOwned(trimmed);
    return classified ?? { kind: "defer" };
  } catch (error) {
    if (error instanceof ReferenceSyntaxError) {
      return { kind: "error", code: error.code, message: error.message };
    }
    return {
      kind: "error",
      code: "PS_REFERENCE_PARSE_ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function referenceLower(source: string): ReferenceLoweringResult {
  const decision = referenceParse(source);
  if (decision.kind === "error") throw new ReferenceSyntaxError(decision.code, decision.message);
  if (decision.kind === "defer") {
    return {
      leanText: canonicalLeanFragment(source.trim()),
      relation: "SyntaxEq",
      featureIds: [],
      sourceMapStatus: "synthetic-only",
    };
  }

  const featureIds = new Set<ReferenceFeatureId>([decision.feature]);
  const leanText = lowerOwned(source.trim(), decision.feature, featureIds);
  return {
    leanText,
    relation: "SyntaxEq",
    featureIds: [...featureIds],
    sourceMapStatus: "synthetic-only",
  };
}

function classifyOwned(source: string): Extract<ReferenceDecision, { kind: "proofscript" }> | undefined {
  if (/^const\b/u.test(source)) {
    const head = parseValueDeclarationHead(source, "const");
    if (head.binders.length) throw new ReferenceSyntaxError("PS_CONST_WITH_PARAMS", "const is a parameterless declaration-head alias");
    return owned("D-CONST-ALIAS", "constAlias", source);
  }

  if (/^function\b/u.test(source)) {
    const head = parseValueDeclarationHead(source, "function");
    if (!head.binders.length) throw new ReferenceSyntaxError("PS_FUNCTION_WITHOUT_PARAMS", "function alias requires at least one explicit declaration parameter group");
    return owned("D-FUNCTION-ALIAS", "functionAlias", source);
  }

  if (/^def\b/u.test(source)) {
    const parsed = parseValueDeclarationHead(source, "def");
    if (parsed.whereBody !== undefined) return owned("E-WHERE-BODY", "whereDefinition", source);
    if (parsed.binders.length) return owned("D-EXPLICIT-PARAMS", "definition", source);
    return undefined;
  }

  if (/^structure\b/u.test(source)) return owned("E-STRUCT-BODY", "structure", source);
  if (/^class\b/u.test(source)) return owned("E-CLASS-BODY", "class", source);
  if (/^inductive\b/u.test(source)) return owned("E-INDUCTIVE-BODY", "inductive", source);
  if (/^match\b/u.test(source) && source.includes("{")) return owned("E-MATCH-BODY", "match", source);
  if (/^if\b/u.test(source) && source.includes("{")) {
    parseBracedIf(source);
    return owned("E-IF-BRACE", "ifBrace", source);
  }
  if (looksLikeAdjacentCall(source)) return owned("D-CALL", "call", source);
  return undefined;
}

function owned(feature: ReferenceFeatureId, kind: ReferenceNode["kind"], source: string): Extract<ReferenceDecision, { kind: "proofscript" }> {
  return { kind: "proofscript", feature, node: { kind, source } };
}

function rejectRegisteredNegativeForms(source: string): void {
  if (/^function\s+[\p{ID_Start}_][\p{ID_Continue}_'?.]*\s*</u.test(source)) {
    throw new ReferenceSyntaxError("PS_TYPESCRIPT_GENERICS_NOT_ADMITTED", "TypeScript generic parameter syntax is not admitted");
  }
  if (/^function\b/u.test(source) && /\{[\s\S]*\breturn\b/u.test(source) && !source.includes(":=")) {
    throw new ReferenceSyntaxError("PS_RETURN_NOT_ADMITTED", "unrestricted JavaScript return/block bodies are not admitted");
  }
  if (/^\{/u.test(source)) {
    throw new ReferenceSyntaxError("PS_GLOBAL_BLOCK_NOT_ADMITTED", "there is no universal JavaScript-style brace block term");
  }
  if (/^if\b/u.test(source) && source.includes("{")) {
    const afterIf = source.slice(2).trimStart();
    if (!afterIf.startsWith("(")) {
      throw new ReferenceSyntaxError("PS_IF_REQUIRES_PARENS", "the braced if form requires a parenthesized condition");
    }
  }
  if (/^match\b/u.test(source) && /\|\s*\.[\p{ID_Start}_][\p{ID_Continue}_'?.]*\s*\(/u.test(source)) {
    throw new ReferenceSyntaxError("PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED", "constructor patterns remain native Lean syntax; call-style pattern sugar is not admitted");
  }
}

function lowerOwned(source: string, feature: ReferenceFeatureId, features: Set<ReferenceFeatureId>): string {
  switch (feature) {
    case "D-CONST-ALIAS": {
      const decl = parseValueDeclarationHead(source, "const");
      return `def ${decl.name} : ${canonicalLeanFragment(decl.type)} := ${canonicalLeanFragment(decl.value, features)}`;
    }
    case "D-FUNCTION-ALIAS": {
      const decl = parseValueDeclarationHead(source, "function");
      features.add("D-EXPLICIT-PARAMS");
      return `def ${decl.name}${emitBinders(decl.binders)} : ${canonicalLeanFragment(decl.type)} := ${canonicalLeanFragment(decl.value, features)}`;
    }
    case "D-EXPLICIT-PARAMS": {
      const decl = parseValueDeclarationHead(source, "def");
      return `def ${decl.name}${emitBinders(decl.binders)} : ${canonicalLeanFragment(decl.type)} := ${canonicalLeanFragment(decl.value, features)}`;
    }
    case "D-CALL":
      return lowerCall(source, features);
    case "E-IF-BRACE": {
      const item = parseBracedIf(source);
      return `if ${canonicalLeanFragment(item.condition, features)} then ${canonicalLeanFragment(item.thenBranch, features)} else ${canonicalLeanFragment(item.elseBranch, features)}`;
    }
    case "E-STRUCT-BODY":
      return lowerStructureLike(source, "structure", features);
    case "E-CLASS-BODY":
      return lowerStructureLike(source, "class", features);
    case "E-INDUCTIVE-BODY":
      return lowerInductive(source, features);
    case "E-MATCH-BODY":
      return lowerMatch(source, features);
    case "E-WHERE-BODY":
      return lowerWhereDefinition(source, features);
    case "D-DECL-SEMI":
      return stripTerminalSemicolon(source);
  }
}

interface ParsedValueDeclaration {
  readonly name: string;
  readonly binders: readonly string[];
  readonly type: string;
  readonly value: string;
  readonly whereBody?: string;
}

function parseValueDeclarationHead(source: string, keyword: "const" | "function" | "def"): ParsedValueDeclaration {
  let rest = source.trim();
  if (!rest.startsWith(keyword)) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `expected ${keyword} declaration`);
  rest = rest.slice(keyword.length).trimStart();

  const nameMatch = /^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);
  if (!nameMatch) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `expected name after ${keyword}`);
  const name = nameMatch[1];
  rest = rest.slice(name.length).trimStart();

  const binders: string[] = [];
  while (rest.startsWith("(")) {
    const group = takeBalanced(rest, 0, "(", ")");
    for (const binder of splitTopLevel(group.inner, ",")) {
      const value = binder.trim();
      if (!value) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "empty explicit parameter");
      binders.push(value);
    }
    rest = rest.slice(group.end).trimStart();
  }

  if (!rest.startsWith(":")) {
    throw new ReferenceSyntaxError(
      keyword === "function" && binders.length === 0 ? "PS_FUNCTION_WITHOUT_PARAMS" : "PS_REFERENCE_PARSE_ERROR",
      `expected ':' in ${keyword} declaration`,
    );
  }
  rest = rest.slice(1);
  const assign = findTopLevel(rest, ":=");
  if (assign < 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `expected ':=' in ${keyword} declaration`);

  const type = rest.slice(0, assign).trim();
  let tail = rest.slice(assign + 2).trim();
  let whereBody: string | undefined;

  const whereIndex = findTopLevelWord(tail, "where");
  if (whereIndex >= 0) {
    const bodyPart = tail.slice(0, whereIndex).trim();
    const wherePart = tail.slice(whereIndex + "where".length).trim();
    if (!wherePart.startsWith("{")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "where overlay requires a braced local declaration body");
    const block = takeBalanced(wherePart, 0, "{", "}");
    if (wherePart.slice(block.end).trim().replace(/^;$/u, "")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "unexpected source after where body");
    tail = bodyPart;
    whereBody = block.inner;
  } else {
    tail = stripTerminalSemicolon(tail);
  }

  return { name, binders, type, value: tail.trim(), ...(whereBody !== undefined ? { whereBody } : {}) };
}

function emitBinders(binders: readonly string[]): string {
  return binders.map((binder) => ` (${canonicalBinder(binder)})`).join("");
}

function canonicalBinder(binder: string): string {
  const colon = findTopLevel(binder, ":");
  if (colon < 0) return canonicalLeanFragment(binder);
  const names = binder.slice(0, colon).trim().split(/\s+/u).filter(Boolean);
  const type = canonicalLeanFragment(binder.slice(colon + 1).trim());
  if (names.length <= 1) return `${names[0] ?? "_"} : ${type}`;
  return `${names.join(" ")} : ${type}`;
}

function canonicalLeanFragment(source: string, features = new Set<ReferenceFeatureId>()): string {
  let value = source.trim();
  if (!value) return value;

  if (/^if\b/u.test(value) && value.includes("{")) {
    features.add("E-IF-BRACE");
    return lowerOwned(value, "E-IF-BRACE", features);
  }
  if (/^match\b/u.test(value) && value.includes("{")) {
    features.add("E-MATCH-BODY");
    return lowerOwned(value, "E-MATCH-BODY", features);
  }
  if (looksLikeAdjacentCall(value)) {
    features.add("D-CALL");
    return lowerCall(value, features);
  }

  value = normalizeNestedAdjacentCalls(value, features);
  value = normalizeOperatorSpacing(value);
  return normalizeWhitespace(value);
}

function looksLikeAdjacentCall(source: string): boolean {
  const trimmed = source.trim();
  const open = findCallOpen(trimmed);
  if (open <= 0) return false;
  if (trimmed[open - 1] && /\s/u.test(trimmed[open - 1])) return false;
  try {
    const group = takeBalanced(trimmed, open, "(", ")");
    return group.end === trimmed.length;
  } catch {
    return false;
  }
}

function findCallOpen(source: string): number {
  let depth = 0;
  let quote: string | undefined;
  for (let i = source.length - 1; i >= 0; i--) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = undefined;
      continue;
    }
    if (ch === "\"" || ch === "'") { quote = ch; continue; }
    if (ch === ")") depth++;
    else if (ch === "(") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lowerCall(source: string, features: Set<ReferenceFeatureId>): string {
  const trimmed = source.trim();
  const open = findCallOpen(trimmed);
  if (open <= 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "invalid adjacent call");
  const group = takeBalanced(trimmed, open, "(", ")");
  if (group.end !== trimmed.length) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "call suffix must consume the source fragment");
  const callee = canonicalLeanFragment(trimmed.slice(0, open), features);
  const rawArgs = splitTopLevel(group.inner, ",").map((item) => item.trim());

  if (rawArgs.length === 1 && rawArgs[0].startsWith("(") && isEntireBalanced(rawArgs[0], "(", ")")) {
    const tuple = takeBalanced(rawArgs[0], 0, "(", ")");
    const items = splitTopLevel(tuple.inner, ",");
    if (items.length > 1) return `${callee} (${items.map((item) => canonicalLeanFragment(item, features)).join(", ")})`;
  }

  if (rawArgs.length === 1 && rawArgs[0] === "") return `${callee} ()`;
  return [callee, ...rawArgs.map((item) => canonicalLeanFragment(item, features))].join(" ");
}

function normalizeNestedAdjacentCalls(source: string, features: Set<ReferenceFeatureId>): string {
  let out = "";
  for (let i = 0; i < source.length;) {
    const id = /^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(source.slice(i));
    if (!id) { out += source[i++]; continue; }
    const name = id[1];
    const after = i + name.length;
    if (source[after] === "(") {
      const group = takeBalanced(source, after, "(", ")");
      features.add("D-CALL");
      out += lowerCall(source.slice(i, group.end), features);
      i = group.end;
      continue;
    }
    out += name;
    i = after;
  }
  return out;
}

interface ParsedIf { condition: string; thenBranch: string; elseBranch: string }

function parseBracedIf(source: string): ParsedIf {
  let rest = source.trim();
  if (!rest.startsWith("if")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected if");
  rest = rest.slice(2).trimStart();
  if (!rest.startsWith("(")) throw new ReferenceSyntaxError("PS_IF_REQUIRES_PARENS", "the braced if form requires a parenthesized condition");

  const cond = takeBalanced(rest, 0, "(", ")");
  rest = rest.slice(cond.end).trimStart();
  if (!rest.startsWith("{")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected braced then branch");
  const yes = takeBalanced(rest, 0, "{", "}");
  assertSingleTermBranch(yes.inner);
  rest = rest.slice(yes.end).trimStart();
  if (!/^else\b/u.test(rest)) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected else");
  rest = rest.replace(/^else\b/u, "").trimStart();
  if (!rest.startsWith("{")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected braced else branch");
  const no = takeBalanced(rest, 0, "{", "}");
  assertSingleTermBranch(no.inner);
  if (rest.slice(no.end).trim()) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "unexpected source after if expression");
  return { condition: cond.inner.trim(), thenBranch: yes.inner.trim(), elseBranch: no.inner.trim() };
}

function assertSingleTermBranch(source: string): void {
  if (splitTopLevel(source, ";").map((x) => x.trim()).filter(Boolean).length > 1 || hasTopLevelDelimiter(source, ";")) {
    throw new ReferenceSyntaxError("PS_BRANCH_REQUIRES_SINGLE_TERM", "braced if branches contain exactly one term");
  }
}

function lowerStructureLike(source: string, keyword: "structure" | "class", features: Set<ReferenceFeatureId>): string {
  const header = parseBracedWhereHeader(source, keyword);
  const members = splitTopLevel(header.body, ";").map((x) => x.trim()).filter(Boolean);
  const lines = members.map((member) => {
    if (member.startsWith("{") && isEntireBalanced(member, "{", "}")) {
      const inner = takeBalanced(member, 0, "{", "}").inner.trim();
      return `  {${canonicalLeanFragment(inner, features)}}`;
    }
    return `  ${canonicalLeanFragment(member, features)}`;
  });
  return `${keyword} ${canonicalDeclarationHead(header.head, features)} where\n${lines.join("\n")}`;
}

function lowerInductive(source: string, features: Set<ReferenceFeatureId>): string {
  const header = parseBracedWhereHeader(source, "inductive");
  const ctors = splitTopLevel(header.body, ";").map((x) => x.trim()).filter(Boolean);
  const lines = ctors.map((ctor) => {
    if (!ctor.startsWith("|")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "inductive body members must be constructors");
    const raw = ctor.slice(1).trim();
    const nameMatch = /^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(raw);
    if (!nameMatch) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "invalid constructor name");
    const name = nameMatch[1];
    let tail = raw.slice(name.length).trimStart();
    const binders: string[] = [];
    while (tail.startsWith("(")) {
      const group = takeBalanced(tail, 0, "(", ")");
      for (const b of splitTopLevel(group.inner, ",")) binders.push(b.trim());
      tail = tail.slice(group.end).trimStart();
    }
    const suffix = tail ? ` ${canonicalLeanFragment(tail, features)}` : "";
    return `  | ${name}${emitBinders(binders)}${suffix}`;
  });
  return `inductive ${canonicalDeclarationHead(header.head, features)} where\n${lines.join("\n")}`;
}

function lowerMatch(source: string, features: Set<ReferenceFeatureId>): string {
  const match = /^match\b/u.exec(source.trim());
  if (!match) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected match");
  let rest = source.trim().slice(match[0].length).trimStart();
  const withIndex = findTopLevelWord(rest, "with");
  if (withIndex < 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "match overlay requires with");
  const scrutinee = rest.slice(0, withIndex).trim();
  rest = rest.slice(withIndex + 4).trimStart();
  if (!rest.startsWith("{")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "match overlay requires braced alternatives");
  const block = takeBalanced(rest, 0, "{", "}");
  if (rest.slice(block.end).trim()) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "unexpected source after match body");

  const alts = splitTopLevel(block.inner, ";").map((x) => x.trim()).filter(Boolean);
  const lines = alts.map((alt) => {
    if (!alt.startsWith("|")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "match alternative must start with '|'");
    const arrow = findTopLevel(alt, "=>");
    if (arrow < 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "match alternative requires =>");
    const pattern = normalizeWhitespace(alt.slice(1, arrow).trim());
    if (/\.[\p{ID_Start}_][\p{ID_Continue}_'?.]*\s*\(/u.test(pattern)) {
      throw new ReferenceSyntaxError("PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED", "call-style constructor patterns are not admitted");
    }
    const rhs = canonicalLeanFragment(alt.slice(arrow + 2).trim(), features);
    return `  | ${pattern} => ${rhs}`;
  });
  return `match ${canonicalLeanFragment(scrutinee, features)} with\n${lines.join("\n")}`;
}

function lowerWhereDefinition(source: string, features: Set<ReferenceFeatureId>): string {
  const decl = parseValueDeclarationHead(source, "def");
  if (decl.whereBody === undefined) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "expected where body");
  const locals = splitTopLevel(decl.whereBody, ";").map((x) => x.trim()).filter(Boolean);
  const localLines = locals.map((local) => {
    const parsed = parseLocalDefinition(local);
    return `  ${parsed.name}${emitBinders(parsed.binders)} : ${canonicalLeanFragment(parsed.type, features)} := ${canonicalLeanFragment(parsed.value, features)}`;
  });
  return `def ${decl.name}${emitBinders(decl.binders)} : ${canonicalLeanFragment(decl.type, features)} := ${canonicalLeanFragment(decl.value, features)} where\n${localLines.join("\n")}`;
}

function parseLocalDefinition(source: string): ParsedValueDeclaration {
  let rest = source.trim();
  const nameMatch = /^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);
  if (!nameMatch) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "invalid local where declaration");
  const name = nameMatch[1];
  rest = rest.slice(name.length).trimStart();
  const binders: string[] = [];
  while (rest.startsWith("(")) {
    const group = takeBalanced(rest, 0, "(", ")");
    for (const b of splitTopLevel(group.inner, ",")) binders.push(b.trim());
    rest = rest.slice(group.end).trimStart();
  }
  if (!rest.startsWith(":")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "local where declaration requires type");
  rest = rest.slice(1);
  const assign = findTopLevel(rest, ":=");
  if (assign < 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", "local where declaration requires :=");
  return {
    name,
    binders,
    type: rest.slice(0, assign).trim(),
    value: rest.slice(assign + 2).trim(),
  };
}

function parseBracedWhereHeader(source: string, keyword: "structure" | "class" | "inductive"): { head: string; body: string } {
  let rest = source.trim();
  if (!rest.startsWith(keyword)) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `expected ${keyword}`);
  rest = rest.slice(keyword.length).trimStart();
  const whereIndex = findTopLevelWord(rest, "where");
  if (whereIndex < 0) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `${keyword} overlay requires where`);
  const head = rest.slice(0, whereIndex).trim();
  rest = rest.slice(whereIndex + 5).trimStart();
  if (!rest.startsWith("{")) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `${keyword} overlay requires braced body`);
  const block = takeBalanced(rest, 0, "{", "}");
  const trailing = rest.slice(block.end).trim();
  if (trailing && trailing !== ";") throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `unexpected source after ${keyword} body`);
  return { head, body: block.inner };
}

function canonicalDeclarationHead(source: string, features: Set<ReferenceFeatureId>): string {
  let rest = source.trim();
  const nameMatch = /^([\p{ID_Start}_][\p{ID_Continue}_'?.]*)/u.exec(rest);
  if (!nameMatch) return canonicalLeanFragment(rest, features);
  const name = nameMatch[1];
  rest = rest.slice(name.length).trimStart();
  const binders: string[] = [];
  while (rest.startsWith("(")) {
    const group = takeBalanced(rest, 0, "(", ")");
    for (const b of splitTopLevel(group.inner, ",")) binders.push(b.trim());
    rest = rest.slice(group.end).trimStart();
  }
  if (binders.length) features.add("D-EXPLICIT-PARAMS");
  return `${name}${emitBinders(binders)}${rest ? ` ${canonicalLeanFragment(rest, features)}` : ""}`;
}

function normalizeOperatorSpacing(source: string): string {
  return source
    .replace(/\s*(->|:=|=>|>=|<=|==|!=|\+|\*|>|<)\s*/gu, " $1 ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeWhitespace(source: string): string {
  return source.replace(/\s+/gu, " ").trim();
}

function stripTerminalSemicolon(source: string): string {
  const trimmed = source.trim();
  return trimmed.endsWith(";") ? trimmed.slice(0, -1).trimEnd() : trimmed;
}

function isEntireBalanced(source: string, open: string, close: string): boolean {
  try {
    const group = takeBalanced(source.trim(), 0, open, close);
    return group.end === source.trim().length;
  } catch {
    return false;
  }
}

function takeBalanced(source: string, start: number, open: string, close: string): { inner: string; end: number } {
  if (!source.startsWith(open, start)) throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `expected '${open}'`);
  let depth = 0;
  let quote: string | undefined;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = undefined;
      continue;
    }
    if (ch === "\"" || ch === "'") { quote = ch; continue; }
    if (source.startsWith(open, i)) {
      depth++;
      i += open.length - 1;
      continue;
    }
    if (source.startsWith(close, i)) {
      depth--;
      if (depth === 0) return { inner: source.slice(start + open.length, i), end: i + close.length };
      i += close.length - 1;
    }
  }
  throw new ReferenceSyntaxError("PS_REFERENCE_PARSE_ERROR", `unterminated '${open}' group`);
}

function splitTopLevel(source: string, delimiter: string): string[] {
  const out: string[] = [];
  let start = 0;
  let paren = 0, brace = 0, bracket = 0;
  let quote: string | undefined;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = undefined;
      continue;
    }
    if (ch === "\"" || ch === "'") { quote = ch; continue; }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "{") brace++;
    else if (ch === "}") brace--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
    if (paren === 0 && brace === 0 && bracket === 0 && source.startsWith(delimiter, i)) {
      out.push(source.slice(start, i));
      start = i + delimiter.length;
      i += delimiter.length - 1;
    }
  }
  out.push(source.slice(start));
  return out;
}

function hasTopLevelDelimiter(source: string, delimiter: string): boolean {
  return splitTopLevel(source, delimiter).length > 1;
}

function findTopLevel(source: string, needle: string): number {
  let paren = 0, brace = 0, bracket = 0;
  let quote: string | undefined;
  for (let i = 0; i <= source.length - needle.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = undefined;
      continue;
    }
    if (ch === "\"" || ch === "'") { quote = ch; continue; }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "{") brace++;
    else if (ch === "}") brace--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
    if (paren === 0 && brace === 0 && bracket === 0 && source.startsWith(needle, i)) return i;
  }
  return -1;
}

function findTopLevelWord(source: string, word: string): number {
  let from = 0;
  while (from < source.length) {
    const index = source.indexOf(word, from);
    if (index < 0) return -1;
    if (findTopLevel(source.slice(0, index + word.length), word) === index) {
      const before = source[index - 1];
      const after = source[index + word.length];
      if ((!before || !/[\p{ID_Continue}_'?.]/u.test(before)) && (!after || !/[\p{ID_Continue}_'?.]/u.test(after))) return index;
    }
    from = index + word.length;
  }
  return -1;
}
