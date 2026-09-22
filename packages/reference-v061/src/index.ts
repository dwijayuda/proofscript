export type SurfaceFeatureId =
  | "L-CORE-LEAN" | "D-CALL" | "D-EXPLICIT-PARAMS" | "D-DECL-SEMI"
  | "D-CONST-ALIAS" | "D-FUNCTION-ALIAS" | "E-IF-BRACE"
  | "E-STRUCT-BODY" | "E-CLASS-BODY" | "E-INDUCTIVE-BODY"
  | "E-MATCH-BODY" | "E-WHERE-BODY";

export type ReferenceErrorCode =
  | "PS_UNKNOWN_FEATURE" | "PS_UNREGISTERED_EXCEPTION" | "PS_AMBIGUOUS_OWNERSHIP"
  | "PS_CONST_WITH_PARAMS" | "PS_FUNCTION_WITHOUT_PARAMS" | "PS_IF_REQUIRES_PARENS"
  | "PS_BRANCH_REQUIRES_SINGLE_TERM" | "PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED"
  | "PS_VERSION_MISMATCH" | "PS_REFERENCE_SYNTAX";

export interface ReferenceFailure {
  readonly ok: false;
  readonly code: ReferenceErrorCode;
  readonly message: string;
  readonly offset: number;
}
export interface LoweringResult {
  readonly leanText: string;
  readonly relation: "SyntaxEq" | "NormalizedSyntaxEq" | "ElabEq";
  readonly featureIds: readonly SurfaceFeatureId[];
  readonly sourceMapStatus: "synthetic-only" | "diagnostic-mapped" | "proof-tracked";
}
export interface ReferenceSuccess {
  readonly ok: true;
  readonly featureIds: readonly SurfaceFeatureId[];
  readonly lowering: LoweringResult;
}
export type ReferenceResult = ReferenceSuccess | ReferenceFailure;

type TokenKind = "id" | "num" | "str" | "sym" | "eof";
interface Token { readonly kind: TokenKind; readonly text: string; readonly start: number; readonly end: number; }
interface NodeBase { readonly feature: SurfaceFeatureId; readonly start: number; readonly end: number; }

type TypeNode =
  | (NodeBase & { readonly tag: "typeName"; readonly name: string })
  | (NodeBase & { readonly tag: "typeArrow"; readonly left: TypeNode; readonly right: TypeNode });

type TermNode =
  | (NodeBase & { readonly tag: "name"; readonly name: string })
  | (NodeBase & { readonly tag: "num"; readonly value: string })
  | (NodeBase & { readonly tag: "lambda"; readonly binder: string; readonly body: TermNode })
  | (NodeBase & { readonly tag: "binary"; readonly op: string; readonly left: TermNode; readonly right: TermNode })
  | (NodeBase & { readonly tag: "call"; readonly callee: TermNode; readonly args: readonly TermNode[] })
  | (NodeBase & { readonly tag: "tuple"; readonly items: readonly TermNode[] })
  | (NodeBase & { readonly tag: "if"; readonly condition: TermNode; readonly thenBranch: TermNode; readonly elseBranch: TermNode })
  | (NodeBase & { readonly tag: "match"; readonly scrutinee: TermNode; readonly cases: readonly MatchCase[] });

interface Param { readonly name: string; readonly type: TypeNode; readonly implicit?: boolean; }
interface MatchPattern { readonly ctor: string; readonly binder?: string; }
interface MatchCase { readonly pattern: MatchPattern; readonly body: TermNode; }
interface LocalDecl { readonly name: string; readonly params: readonly Param[]; readonly type: TypeNode; readonly value: TermNode; }

type TopNode =
  | (NodeBase & { readonly tag: "valueDecl"; readonly name: string; readonly params: readonly Param[]; readonly type: TypeNode; readonly value: TermNode; readonly whereDecls: readonly LocalDecl[] })
  | (NodeBase & { readonly tag: "structure"; readonly name: string; readonly classLike: boolean; readonly fields: readonly Param[] })
  | (NodeBase & { readonly tag: "inductive"; readonly name: string; readonly params: readonly Param[]; readonly constructors: readonly { readonly name: string; readonly params: readonly Param[] }[] })
  | (NodeBase & { readonly tag: "term"; readonly value: TermNode });

class ReferenceSyntaxError extends Error {
  constructor(readonly code: ReferenceErrorCode, message: string, readonly offset: number) {
    super(message);
    this.name = "ReferenceSyntaxError";
  }
}

export function parseAndLowerReferenceV061(source: string): ReferenceResult {
  try {
    const parser = new Parser(tokenize(source));
    const node = parser.parseTop();
    parser.expectEof();
    const featureIds = Array.from(collectFeatures(node)).sort();
    return {
      ok: true,
      featureIds,
      lowering: {
        leanText: emitTop(node),
        relation: "SyntaxEq",
        featureIds,
        sourceMapStatus: "synthetic-only",
      },
    };
  } catch (error) {
    if (error instanceof ReferenceSyntaxError) {
      return { ok: false, code: error.code, message: error.message, offset: error.offset };
    }
    return { ok: false, code: "PS_UNREGISTERED_EXCEPTION", message: error instanceof Error ? error.message : String(error), offset: 0 };
  }
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: readonly Token[]) {}

  parseTop(): TopNode {
    const first = this.peek();
    if (first.text === "{") throw this.fail("PS_UNKNOWN_FEATURE", "global brace blocks are not admitted", first.start);
    if (this.atId("const")) return this.parseConst();
    if (this.atId("function")) return this.parseFunction();
    if (this.atId("def")) return this.parseDef();
    if (this.atId("structure")) return this.parseStructure(false);
    if (this.atId("class")) return this.parseStructure(true);
    if (this.atId("inductive")) return this.parseInductive();
    const value = this.parseTerm();
    return { tag: "term", feature: value.feature, start: value.start, end: value.end, value };
  }

  expectEof(): void {
    const token = this.peek();
    if (token.kind !== "eof") throw this.fail("PS_REFERENCE_SYNTAX", "unexpected token '" + token.text + "'", token.start);
  }

  private parseConst(): TopNode {
    const start = this.expectId("const").start;
    const name = this.expectKind("id", "const name");
    if (this.at("(")) throw this.fail("PS_CONST_WITH_PARAMS", "const declarations do not admit explicit parameters", this.peek().start);
    this.expect(":");
    const type = this.parseType();
    this.expect(":=");
    const value = this.parseTerm();
    const semi = this.expect(";");
    return { tag: "valueDecl", feature: "D-CONST-ALIAS", start, end: semi.end, name: name.text, params: [], type, value, whereDecls: [] };
  }

  private parseFunction(): TopNode {
    const start = this.expectId("function").start;
    const name = this.expectKind("id", "function name");
    if (this.at("<")) throw this.fail("PS_UNKNOWN_FEATURE", "TypeScript generic parameter syntax is not admitted", this.peek().start);
    if (!this.at("(")) throw this.fail("PS_FUNCTION_WITHOUT_PARAMS", "function alias requires explicit parameters", this.peek().start);
    const params = this.parseExplicitParams();
    if (params.length === 0) throw this.fail("PS_FUNCTION_WITHOUT_PARAMS", "function alias requires at least one parameter", this.peek().start);
    this.expect(":");
    const type = this.parseType();
    if (!this.at(":=")) throw this.fail("PS_UNKNOWN_FEATURE", "block-bodied JavaScript functions are not admitted", this.peek().start);
    this.next();
    const value = this.parseTerm();
    const semi = this.expect(";");
    return { tag: "valueDecl", feature: "D-FUNCTION-ALIAS", start, end: semi.end, name: name.text, params, type, value, whereDecls: [] };
  }

  private parseDef(): TopNode {
    const start = this.expectId("def").start;
    const name = this.expectKind("id", "definition name");
    const params = this.at("(") ? this.parseExplicitParams() : [];
    this.expect(":");
    const type = this.parseType();
    this.expect(":=");
    const value = this.parseTerm();
    const whereDecls = this.atId("where") ? this.parseWhereBlock() : [];
    const end = whereDecls.length ? this.previous().end : this.expect(";").end;
    return {
      tag: "valueDecl",
      feature: params.length ? "D-EXPLICIT-PARAMS" : "L-CORE-LEAN",
      start, end, name: name.text, params, type, value, whereDecls,
    };
  }

  private parseWhereBlock(): LocalDecl[] {
    this.expectId("where");
    this.expect("{");
    const out: LocalDecl[] = [];
    while (!this.at("}")) {
      const name = this.expectKind("id", "local declaration name").text;
      const params = this.at("(") ? this.parseExplicitParams() : [];
      this.expect(":");
      const type = this.parseType();
      this.expect(":=");
      const value = this.parseTerm();
      this.expect(";");
      out.push({ name, params, type, value });
    }
    this.expect("}");
    return out;
  }

  private parseStructure(classLike: boolean): TopNode {
    const start = this.next().start;
    const name = this.expectKind("id", classLike ? "class name" : "structure name").text;
    this.expectId("where");
    this.expect("{");
    const fields: Param[] = [];
    while (!this.at("}")) {
      if (this.at("{")) {
        this.next();
        const fieldName = this.expectKind("id", "implicit field").text;
        this.expect(":");
        const type = this.parseType();
        this.expect("}");
        this.expect(";");
        fields.push({ name: fieldName, type, implicit: true });
      } else {
        const fieldName = this.expectKind("id", "field name").text;
        this.expect(":");
        const type = this.parseType();
        this.expect(";");
        fields.push({ name: fieldName, type });
      }
    }
    const close = this.expect("}");
    if (this.at(";")) this.next();
    return {
      tag: "structure",
      feature: classLike ? "E-CLASS-BODY" : "E-STRUCT-BODY",
      start, end: close.end, name, classLike, fields,
    };
  }

  private parseInductive(): TopNode {
    const start = this.expectId("inductive").start;
    const name = this.expectKind("id", "inductive name").text;
    const params = this.at("(") ? this.parseExplicitParams() : [];
    this.expectId("where");
    this.expect("{");
    const constructors: { name: string; params: readonly Param[] }[] = [];
    while (!this.at("}")) {
      this.expect("|");
      const ctorName = this.expectKind("id", "constructor name").text;
      const ctorParams = this.at("(") ? this.parseExplicitParams() : [];
      if (this.at(":")) throw this.fail("PS_UNKNOWN_FEATURE", "constructor result annotations are outside this reference corpus", this.peek().start);
      if (this.at(";")) this.next();
      constructors.push({ name: ctorName, params: ctorParams });
    }
    const close = this.expect("}");
    if (this.at(";")) this.next();
    return { tag: "inductive", feature: "E-INDUCTIVE-BODY", start, end: close.end, name, params, constructors };
  }

  private parseExplicitParams(): Param[] {
    this.expect("(");
    const out: Param[] = [];
    if (!this.at(")")) {
      while (true) {
        const name = this.expectKind("id", "parameter name").text;
        this.expect(":");
        out.push({ name, type: this.parseType() });
        if (!this.at(",")) break;
        this.next();
      }
    }
    this.expect(")");
    return out;
  }

  private parseType(): TypeNode {
    const left = this.parseTypeAtom();
    if (!this.at("->")) return left;
    this.next();
    const right = this.parseType();
    return { tag: "typeArrow", feature: "L-CORE-LEAN", start: left.start, end: right.end, left, right };
  }

  private parseTypeAtom(): TypeNode {
    if (this.at("(")) {
      const start = this.next().start;
      const inner = this.parseType();
      const close = this.expect(")");
      return { ...inner, start, end: close.end };
    }
    const token = this.expectKind("id", "type");
    return { tag: "typeName", feature: "L-CORE-LEAN", start: token.start, end: token.end, name: token.text };
  }

  private parseTerm(minPrecedence = 0): TermNode {
    let left = this.parsePrefix();
    while (true) {
      const token = this.peek();
      const precedence = binaryPrecedence(token.text);
      if (precedence < minPrecedence) break;
      this.next();
      const right = this.parseTerm(precedence + 1);
      left = { tag: "binary", feature: "L-CORE-LEAN", start: left.start, end: right.end, op: token.text, left, right };
    }
    return left;
  }

  private parsePrefix(): TermNode {
    if (this.atId("if")) return this.parseIf();
    if (this.atId("match")) return this.parseMatch();
    if (this.atId("fun")) return this.parseLambda();
    let term = this.parseAtom();
    while (this.at("(") && this.peek().start === term.end) {
      const start = term.start;
      this.next();
      const args: TermNode[] = [];
      if (!this.at(")")) {
        while (true) {
          args.push(this.parseTerm());
          if (!this.at(",")) break;
          this.next();
        }
      }
      const close = this.expect(")");
      term = { tag: "call", feature: "D-CALL", start, end: close.end, callee: term, args };
    }
    return term;
  }

  private parseLambda(): TermNode {
    const start = this.expectId("fun").start;
    const binder = this.expectKind("id", "lambda binder").text;
    this.expect("=>");
    const body = this.parseTerm();
    return { tag: "lambda", feature: "L-CORE-LEAN", start, end: body.end, binder, body };
  }

  private parseIf(): TermNode {
    const start = this.expectId("if").start;
    if (!this.at("(")) throw this.fail("PS_IF_REQUIRES_PARENS", "braced if requires a parenthesized condition", this.peek().start);
    this.next();
    const condition = this.parseTerm();
    this.expect(")");
    this.expect("{");
    const thenBranch = this.parseTerm();
    if (this.at(";")) throw this.fail("PS_BRANCH_REQUIRES_SINGLE_TERM", "if branch contains more than one statement-like term", this.peek().start);
    this.expect("}");
    this.expectId("else");
    this.expect("{");
    const elseBranch = this.parseTerm();
    if (this.at(";")) throw this.fail("PS_BRANCH_REQUIRES_SINGLE_TERM", "if branch contains more than one statement-like term", this.peek().start);
    const close = this.expect("}");
    return { tag: "if", feature: "E-IF-BRACE", start, end: close.end, condition, thenBranch, elseBranch };
  }

  private parseMatch(): TermNode {
    const start = this.expectId("match").start;
    const scrutinee = this.parseTerm();
    this.expectId("with");
    this.expect("{");
    const cases: MatchCase[] = [];
    while (!this.at("}")) {
      this.expect("|");
      const pattern = this.parsePattern();
      this.expect("=>");
      const body = this.parseTerm();
      if (this.at(";")) this.next();
      cases.push({ pattern, body });
    }
    const close = this.expect("}");
    return { tag: "match", feature: "E-MATCH-BODY", start, end: close.end, scrutinee, cases };
  }

  private parsePattern(): MatchPattern {
    this.expect(".");
    const ctor = this.expectKind("id", "constructor pattern").text;
    if (this.at("(")) throw this.fail("PS_PATTERN_CALL_SYNTAX_NOT_ADMITTED", "pattern call syntax is not admitted", this.peek().start);
    const binder = this.peek().kind === "id" ? this.next().text : undefined;
    return binder ? { ctor, binder } : { ctor };
  }

  private parseAtom(): TermNode {
    const token = this.peek();
    if (token.kind === "num") {
      this.next();
      return { tag: "num", feature: "L-CORE-LEAN", start: token.start, end: token.end, value: token.text };
    }
    if (token.kind === "id") {
      this.next();
      if (token.text === "return" || token.text === "let" || token.text === "have") {
        throw this.fail("PS_UNKNOWN_FEATURE", "term '" + token.text + "' is not admitted by v0.6.1", token.start);
      }
      return { tag: "name", feature: "L-CORE-LEAN", start: token.start, end: token.end, name: token.text };
    }
    if (token.text === "(") {
      const start = this.next().start;
      const first = this.parseTerm();
      if (this.at(",")) {
        const items: TermNode[] = [first];
        while (this.at(",")) {
          this.next();
          if (this.at(")")) throw this.fail("PS_REFERENCE_SYNTAX", "tuple element expected", this.peek().start);
          items.push(this.parseTerm());
        }
        const close = this.expect(")");
        return { tag: "tuple", feature: "L-CORE-LEAN", start, end: close.end, items };
      }
      const close = this.expect(")");
      return { ...first, start, end: close.end };
    }
    throw this.fail("PS_UNKNOWN_FEATURE", "unregistered source form starting with '" + token.text + "'", token.start);
  }

  private at(text: string): boolean { return this.peek().text === text; }
  private atId(text: string): boolean { return this.peek().kind === "id" && this.peek().text === text; }
  private peek(ahead = 0): Token { return this.tokens[Math.min(this.index + ahead, this.tokens.length - 1)]!; }
  private previous(): Token { return this.tokens[Math.max(0, this.index - 1)]!; }
  private next(): Token { return this.tokens[this.index++]!; }
  private expect(text: string): Token {
    const token = this.peek();
    if (token.text !== text) throw this.fail("PS_REFERENCE_SYNTAX", "expected '" + text + "', found '" + token.text + "'", token.start);
    return this.next();
  }
  private expectId(text: string): Token {
    const token = this.peek();
    if (token.kind !== "id" || token.text !== text) throw this.fail("PS_REFERENCE_SYNTAX", "expected '" + text + "', found '" + token.text + "'", token.start);
    return this.next();
  }
  private expectKind(kind: TokenKind, what: string): Token {
    const token = this.peek();
    if (token.kind !== kind) throw this.fail("PS_REFERENCE_SYNTAX", "expected " + what + ", found '" + token.text + "'", token.start);
    return this.next();
  }
  private fail(code: ReferenceErrorCode, message: string, offset: number): ReferenceSyntaxError {
    return new ReferenceSyntaxError(code, message, offset);
  }
}

function emitTop(node: TopNode): string {
  if (node.tag === "term") return emitTerm(node.value);
  if (node.tag === "valueDecl") {
    const params = node.params.map(emitParam).join(" ");
    let out = "def " + node.name + (params ? " " + params : "") + " : " + emitType(node.type) + " := " + emitTerm(node.value);
    if (node.whereDecls.length) out += " where\n" + node.whereDecls.map((d) => "  " + emitLocal(d)).join("\n");
    return out;
  }
  if (node.tag === "structure") {
    const keyword = node.classLike ? "class" : "structure";
    return keyword + " " + node.name + " where\n" + node.fields.map((f) =>
      f.implicit ? "  {" + f.name + " : " + emitType(f.type) + "}" : "  " + f.name + " : " + emitType(f.type)
    ).join("\n");
  }
  const params = node.params.map(emitParam).join(" ");
  return "inductive " + node.name + (params ? " " + params : "") + " where\n" +
    node.constructors.map((c) => {
      const ps = c.params.map(emitParam).join(" ");
      return "  | " + c.name + (ps ? " " + ps : "");
    }).join("\n");
}

function emitLocal(decl: LocalDecl): string {
  const params = decl.params.map(emitParam).join(" ");
  return decl.name + (params ? " " + params : "") + " : " + emitType(decl.type) + " := " + emitTerm(decl.value);
}
function emitParam(param: Param): string {
  return param.implicit ? "{" + param.name + " : " + emitType(param.type) + "}" : "(" + param.name + " : " + emitType(param.type) + ")";
}
function emitType(type: TypeNode): string {
  return type.tag === "typeName" ? type.name : emitType(type.left) + " -> " + emitType(type.right);
}
function emitTerm(term: TermNode, parent = 0): string {
  switch (term.tag) {
    case "name": return term.name;
    case "num": return term.value;
    case "tuple": return "(" + term.items.map((x) => emitTerm(x)).join(", ") + ")";
    case "lambda": return "fun " + term.binder + " => " + emitTerm(term.body);
    case "call": return emitTerm(term.callee, 90) + " " + term.args.map(emitArg).join(" ");
    case "binary": {
      const p = binaryPrecedence(term.op);
      const body = emitTerm(term.left, p) + " " + term.op + " " + emitTerm(term.right, p + 1);
      return p < parent ? "(" + body + ")" : body;
    }
    case "if": return "if " + emitTerm(term.condition) + " then " + emitTerm(term.thenBranch) + " else " + emitTerm(term.elseBranch);
    case "match":
      return "match " + emitTerm(term.scrutinee) + " with\n" +
        term.cases.map((x) => "  | ." + x.pattern.ctor + (x.pattern.binder ? " " + x.pattern.binder : "") + " => " + emitTerm(x.body)).join("\n");
  }
}
function emitArg(term: TermNode): string {
  return term.tag === "name" || term.tag === "num" || term.tag === "tuple" ? emitTerm(term) : "(" + emitTerm(term) + ")";
}

function collectFeatures(node: TopNode): Set<SurfaceFeatureId> {
  const out = new Set<SurfaceFeatureId>();
  const walkType = (x: TypeNode): void => {
    out.add(x.feature);
    if (x.tag === "typeArrow") { walkType(x.left); walkType(x.right); }
  };
  const walkTerm = (x: TermNode): void => {
    out.add(x.feature);
    if (x.tag === "lambda") walkTerm(x.body);
    else if (x.tag === "binary") { walkTerm(x.left); walkTerm(x.right); }
    else if (x.tag === "call") { walkTerm(x.callee); x.args.forEach(walkTerm); }
    else if (x.tag === "tuple") x.items.forEach(walkTerm);
    else if (x.tag === "if") { walkTerm(x.condition); walkTerm(x.thenBranch); walkTerm(x.elseBranch); }
    else if (x.tag === "match") { walkTerm(x.scrutinee); x.cases.forEach((c) => walkTerm(c.body)); }
  };
  out.add(node.feature);
  if (node.tag === "term") walkTerm(node.value);
  else if (node.tag === "valueDecl") {
    node.params.forEach((p) => walkType(p.type)); walkType(node.type); walkTerm(node.value);
    if (node.params.length) out.add("D-EXPLICIT-PARAMS");
    if (node.whereDecls.length) out.add("E-WHERE-BODY");
    node.whereDecls.forEach((d) => { d.params.forEach((p) => walkType(p.type)); walkType(d.type); walkTerm(d.value); });
    out.add("D-DECL-SEMI");
  } else if (node.tag === "structure") {
    node.fields.forEach((p) => walkType(p.type)); out.add("D-DECL-SEMI");
  } else {
    node.params.forEach((p) => walkType(p.type));
    node.constructors.forEach((c) => c.params.forEach((p) => walkType(p.type)));
    if (node.params.length) out.add("D-EXPLICIT-PARAMS");
    out.add("D-DECL-SEMI");
  }
  return out;
}

function binaryPrecedence(op: string): number {
  if (op === ">" || op === "<" || op === ">=" || op === "<=" || op === "==") return 20;
  if (op === "+" || op === "-") return 40;
  if (op === "*") return 50;
  return -1;
}

function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const cp = codePointAt(source, i);
    if (/\s/u.test(cp.text)) { i += cp.length; continue; }
    if (source.startsWith("//", i)) { i += 2; while (i < source.length && source[i] !== "\n") i++; continue; }
    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      if (end < 0) throw new ReferenceSyntaxError("PS_REFERENCE_SYNTAX", "unterminated block comment", i);
      i = end + 2; continue;
    }
    const two = source.slice(i, i + 2);
    if ([":=", "=>", "->", ">=", "<=", "==", "!="].includes(two)) {
      out.push({ kind: "sym", text: two, start: i, end: i + 2 }); i += 2; continue;
    }
    if ("(){}[],;:|.+-*<>".includes(source[i]!)) {
      out.push({ kind: "sym", text: source[i]!, start: i, end: i + 1 }); i++; continue;
    }
    if (/[0-9]/.test(source[i]!)) {
      const start = i++; while (i < source.length && /[0-9]/.test(source[i]!)) i++;
      out.push({ kind: "num", text: source.slice(start, i), start, end: i }); continue;
    }
    if (isIdentifierStart(cp.text)) {
      const start = i; i += cp.length;
      while (i < source.length) {
        const next = codePointAt(source, i);
        if (!isIdentifierContinue(next.text)) break;
        i += next.length;
      }
      out.push({ kind: "id", text: source.slice(start, i), start, end: i }); continue;
    }
    throw new ReferenceSyntaxError("PS_REFERENCE_SYNTAX", "unexpected character " + JSON.stringify(cp.text), i);
  }
  out.push({ kind: "eof", text: "<eof>", start: source.length, end: source.length });
  return out;
}
function codePointAt(source: string, index: number): { text: string; length: number } {
  const code = source.codePointAt(index);
  if (code === undefined) return { text: "", length: 0 };
  const text = String.fromCodePoint(code);
  return { text, length: text.length };
}
function isIdentifierStart(text: string): boolean { return text === "_" || /^\p{ID_Start}$/u.test(text); }
function isIdentifierContinue(text: string): boolean { return text === "_" || text === "'" || text === "?" || /^\p{ID_Continue}$/u.test(text); }
