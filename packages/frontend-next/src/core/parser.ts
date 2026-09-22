import { ProofScriptError } from "./errors.js";
import { lex } from "./lexer.js";
import type { ParserCursor } from "./plugin-api.js";
import type { SurfaceClause, SurfaceExpr, SurfaceProgram, SurfaceTypeExpr, SurfaceUniverseLevel, Token } from "./model.js";
import { parseBinderGroups } from "./binders.js";
import { Registry } from "./registry.js";

export class Parser implements ParserCursor {
  private readonly tokens: readonly Token[];
  private index = 0;
  private readonly commandBlockExits: import("./model.js").SurfaceDecl[] = [];
  private readonly oneCommandScopes: {
    readonly exit: import("./model.js").SurfaceDecl;
    targetStarted: boolean;
    targetBlockDepth?: number;
    childScopes: number;
  }[] = [];

  constructor(source: string, private readonly registry: Registry) {
    this.tokens = lex(source);
  }

  parseProgram(): SurfaceProgram {
    const declarations = [];
    while (true) {
      const declaration = this.parseNextDeclaration();
      if (!declaration) break;
      declarations.push(declaration);
    }
    return { declarations };
  }

  /** Parse exactly one command using the registry state that exists now.
   * The compiler deliberately calls this between elaboration steps so a
   * command can affect the syntax/environment seen by later commands.
   */
  parseNextDeclaration(): SurfaceProgram["declarations"][number] | undefined {
    // Complete one-command environment scopes before consuming the next source command.
    // A wrapped command may itself be a command block or another one-command scope;
    // both must finish before the outer scope is restored.
    const topScope = this.oneCommandScopes.at(-1);
    if (topScope?.targetStarted && topScope.childScopes === 0 && this.commandBlockExits.length <= (topScope.targetBlockDepth ?? 0)) {
      const completed = this.oneCommandScopes.pop()!;
      const parent = this.oneCommandScopes.at(-1);
      if (parent) parent.childScopes = Math.max(0, parent.childScopes - 1);
      return completed.exit;
    }

    if (this.peek("<eof>")) {
      if (this.commandBlockExits.length > 0) {
        throw new ProofScriptError("PS0218", "Unexpected end of file inside a command block; expected '}'.");
      }
      return undefined;
    }

    // A command block is deliberately flattened into enter/body/exit commands.
    // This preserves command-by-command parsing: declarations inside a section
    // are not pre-parsed before earlier declarations have elaborated.
    if (this.peek("}")) {
      const exit = this.commandBlockExits.pop();
      if (!exit) {
        const token = this.current();
        throw new ProofScriptError("PS0219", `Unexpected '}' at offset ${token.offset}.`);
      }
      this.consume("}");
      return exit;
    }

    const awaitingScope = this.oneCommandScopes.at(-1);
    if (awaitingScope && !awaitingScope.targetStarted) {
      awaitingScope.targetStarted = true;
      awaitingScope.targetBlockDepth = this.commandBlockExits.length;
    }

    return this.parseNestedDeclaration();
  }

  parseNestedDeclaration(): import("./model.js").SurfaceDecl {
    const prefixes: import("./model.js").SurfaceDeclarationPrefix[] = [];
    while (true) {
      const token = this.current();
      const prefix = this.registry.declarationPrefixSyntax.get(token.text);
      if (!prefix) break;
      this.consume(token.text);
      prefixes.push(prefix.parse(this));
    }

    const token = this.current();
    if (token.kind !== "identifier") {
      throw new ProofScriptError("PS0201", `Expected a declaration keyword at offset ${token.offset}.`);
    }
    const syntax = this.registry.declarationSyntax.get(token.text);
    if (!syntax) {
      throw new ProofScriptError("PS0202", `No installed feature owns declaration '${token.text}'.`);
    }
    this.consume(token.text);
    const declaration = syntax.parse(this);
    return prefixes.length === 0 ? declaration : { ...declaration, prefixes };
  }

  peek(text?: string): boolean {
    const token = this.current();
    return text === undefined ? token.kind !== "eof" : token.text === text;
  }

  peekAhead(offset: number, text?: string): boolean {
    const token = this.tokens[this.index + offset];
    if (!token) return false;
    return text === undefined ? token.kind !== "eof" : token.text === text;
  }

  currentToken(): Token { return this.current(); }

  consume(text?: string): string {
    const token = this.current();
    if (text !== undefined && token.text !== text) {
      throw new ProofScriptError("PS0203", `Expected '${text}' at offset ${token.offset}, found '${token.text}'.`);
    }
    this.index += 1;
    return token.text;
  }

  expect(text: string): void { this.consume(text); }

  enterCommandBlock(exitDeclaration: import("./model.js").SurfaceDecl): void {
    this.commandBlockExits.push(exitDeclaration);
  }

  enterOneCommandScope(exitDeclaration: import("./model.js").SurfaceDecl): void {
    const parent = this.oneCommandScopes.at(-1);
    if (parent?.targetStarted) parent.childScopes += 1;
    this.oneCommandScopes.push({ exit: exitDeclaration, targetStarted: false, childScopes: 0 });
  }

  parseIdentifier(): string {
    const token = this.current();
    if (token.kind !== "identifier") {
      throw new ProofScriptError("PS0204", `Expected identifier at offset ${token.offset}.`);
    }
    this.index += 1;
    return token.text;
  }

  parseTypeName(): string {
    const type = this.parseTypeExpression();
    return this.surfaceTypeSource(type);
  }

  parseTypeExpression(): SurfaceTypeExpr {
    if (this.peek("∀") || this.peek("forall")) {
      this.consume();
      const params = parseBinderGroups(this);
      if (params.length === 0) throw new ProofScriptError("PS0212", "A universal quantifier requires at least one binder.");
      this.expect(",");
      return { kind: "pi", params, codomain: this.parseTypeExpression() };
    }

    const startsNamedBinder =
      (this.peek("(") && this.peekAhead(2, ":")) ||
      (this.peek("{") && this.peekAhead(2, ":")) ||
      (this.peek("⦃") && this.peekAhead(2, ":")) ||
      (this.peek("[") && this.peekAhead(2, ":"));
    if (startsNamedBinder) {
      const params = parseBinderGroups(this);
      if (!(this.peek("→") || this.peek("->"))) {
        throw new ProofScriptError("PS0213", "A binder in type position must be followed by '→' (or the ASCII alias '->').");
      }
      this.consume();
      return { kind: "pi", params, codomain: this.parseTypeExpression() };
    }

    let atom: SurfaceTypeExpr;
    if (this.peek("Prop")) {
      this.consume("Prop");
      atom = { kind: "sort", sort: "Prop" };
    } else if (this.peek("Type") || this.peek("Sort")) {
      const sort = this.consume() as "Type" | "Sort";
      const level = this.startsUniverseLevel() ? this.parseUniverseLevel() : undefined;
      atom = { kind: "sort", sort, ...(level ? { level } : {}) };
    } else {
      // Preserve the explicit rejection of TypeScript-style type application
      // now that '<' is a real relation operator. The compact Name<Arg> shape
      // must be diagnosed in type position before generic expression parsing
      // can consume '<' as LT.lt.
      if (this.current().kind === "identifier" && this.peekAhead(1, "<") && this.tokens[this.index + 2]?.kind === "identifier" && this.tokens[this.index + 3]?.text === ">") {
        const base = this.current().text;
        throw new ProofScriptError("PS0208", `TypeScript-style type application '${base}<...>' is not canonical ProofScript; use '${base}(...)'.`);
      }
      atom = { kind: "term", expr: this.parseExpression() };
    }
    if (this.peek("<")) {
      const base = atom.kind === "term" && atom.expr.kind === "identifier" ? atom.expr.name : "type";
      throw new ProofScriptError("PS0208", `TypeScript-style type application '${base}<...>' is not canonical ProofScript; use '${base}(...)'.`);
    }
    if (this.peek("→") || this.peek("->")) {
      this.consume();
      return { kind: "arrow", domain: atom, codomain: this.parseTypeExpression() };
    }
    return atom;
  }

  private startsUniverseLevel(): boolean {
    const token = this.current();
    if (token.kind === "number") return true;
    if (token.kind === "identifier") return true;
    return token.text === "(";
  }

  private parseUniverseLevel(): SurfaceUniverseLevel {
    let level: SurfaceUniverseLevel;
    if (this.peek("(")) {
      this.consume("(");
      level = this.parseUniverseLevel();
      this.consume(")");
    } else if (this.peek("max") || this.peek("imax")) {
      const kind = this.consume() as "max" | "imax";
      const left = this.parseUniverseLevelAtom();
      const right = this.parseUniverseLevelAtom();
      level = { kind, left, right };
    } else {
      level = this.parseUniverseLevelAtom();
    }
    if (this.peek("+")) {
      this.consume("+");
      const amountText = this.consume();
      if (!/^[0-9]+$/.test(amountText)) throw new ProofScriptError("PS0215", "Universe successor amount must be a numeral.");
      level = { kind: "succ", base: level, amount: Number(amountText) };
    }
    return level;
  }

  private parseUniverseLevelAtom(): SurfaceUniverseLevel {
    const token = this.current();
    if (token.kind === "number") {
      const text = this.consume();
      const amount = Number(text);
      return amount === 0 ? { kind: "zero" } : { kind: "succ", base: { kind: "zero" }, amount };
    }
    if (token.kind === "identifier") return { kind: "param", name: this.parseIdentifier() };
    if (this.peek("(")) {
      this.consume("(");
      const level = this.parseUniverseLevel();
      this.consume(")");
      return level;
    }
    throw new ProofScriptError("PS0214", `Expected universe level at offset ${token.offset}.`);
  }

  parseDeclarationClauses(): readonly SurfaceClause[] {
    const clauses: SurfaceClause[] = [];
    while (true) {
      const token = this.current();
      if (token.kind !== "identifier") break;
      const syntax = this.registry.declarationClauseSyntax.get(token.text);
      if (!syntax) break;
      this.consume(token.text);
      clauses.push(syntax.parse(this));
    }
    return clauses;
  }

  parseExpression(minPrecedence = 0): SurfaceExpr {
    let left = this.parsePrimary();
    while (true) {
      const token = this.current();
      const infix = this.registry.infixSyntax.get(token.text);
      if (!infix || infix.precedence < minPrecedence) break;
      this.consume(token.text);
      const right = this.parseExpression(infix.precedence + 1);
      left = { kind: "binary", operator: token.text, left, right };
    }
    return left;
  }

  private parsePrimary(): SurfaceExpr {
    const token = this.current();

    if (this.peek("fun")) {
      this.consume("fun");
      const params = parseBinderGroups(this);
      if (params.length === 0) throw new ProofScriptError("PS0216", "A canonical 'fun' lambda requires at least one binder.");
      if (!(this.peek("=>") || this.peek("↦"))) throw new ProofScriptError("PS0217", "A lambda binder sequence must be followed by '=>'.");
      this.consume();
      return { kind: "lambda", params, body: this.parseExpression() };
    }

    if (this.peek("∀") || this.peek("forall") || this.peek("∃") || this.peek("exists")) {
      const head = this.consume();
      const quantifier = head === "∀" || head === "forall" ? "forall" : "exists";
      let params = parseBinderGroups(this);
      if (params.length === 0) {
        const name = this.parseIdentifier();
        this.expect(":");
        params = [{ name, type: this.parseTypeExpression(), binderInfo: "explicit" }];
      }
      this.expect(",");
      return { kind: "quantifier", quantifier, params, body: this.parseExpression() };
    }

    if (token.kind === "number") {
      this.index += 1;
      return { kind: "number", text: token.text };
    }

    if (token.kind === "string") {
      this.index += 1;
      return { kind: "string", text: token.text };
    }

    // Leading-dot constructors are resolved by the installed feature and expected type.
    if (this.peek(".")) {
      this.consume(".");
      const ctor = this.parseIdentifier();
      const key = `.${ctor}`;
      const extension = this.registry.expressionSyntax.get(key);
      if (!extension) throw new ProofScriptError("PS0207", `No installed feature owns anonymous constructor '${key}'.`);
      return extension.parse(this);
    }

    if (this.peek("@")) {
      this.consume("@");
      const name = this.parseQualifiedIdentifier();
      return this.parseCallAfterName(name, true);
    }

    // Extension-owned punctuation forms (for example structure instances beginning
    // with `{`) are dispatched through the same registry as identifier-led forms.
    const punctuationExtension = token.kind === "punct" ? this.registry.expressionSyntax.get(token.text) : undefined;
    if (punctuationExtension) {
      this.consume(token.text);
      return punctuationExtension.parse(this);
    }

    if (token.kind === "identifier") {
      const extension = this.registry.expressionSyntax.get(token.text);
      if (extension) {
        this.consume(token.text);
        return extension.parse(this);
      }

      const name = this.parseQualifiedIdentifier();
      if ((this.peek(".") && this.peekAhead(1, "{")) || this.peek("(")) return this.parseCallAfterName(name, false);
      return { kind: "identifier", name };
    }

    if (this.peek("(")) {
      this.consume("(");
      const expression = this.parseExpression();
      this.consume(")");
      return expression;
    }

    throw new ProofScriptError("PS0205", `Expected expression at offset ${token.offset}, found '${token.text}'.`);
  }

  private parseCallAfterName(name: string, explicitMode: boolean): SurfaceExpr {
    const universeArgs: SurfaceUniverseLevel[] = [];
    if (this.peek(".") && this.peekAhead(1, "{")) {
      this.consume(".");
      this.consume("{");
      if (this.peek("}")) throw new ProofScriptError("PS0220", `Universe application '${name}.{}' must contain at least one universe level.`);
      while (true) {
        universeArgs.push(this.parseUniverseLevel());
        if (this.peek(",")) { this.consume(","); continue; }
        break;
      }
      this.consume("}");
    }
    if (!this.peek("(")) {
      if (explicitMode || universeArgs.length > 0) throw new ProofScriptError("PS0221", `The v0.10 application slice requires '${explicitMode ? "@" : ""}${name}${universeArgs.length ? ".{...}" : ""}' to be followed by a parenthesized application.`);
      return { kind: "identifier", name };
    }
    this.consume("(");
    if (this.peek(")")) {
      throw new ProofScriptError("PS0206", `Empty application '${name}()' is not standard ProofScript; reference a binderless declaration as '${name}'.`);
    }
    const args: SurfaceExpr[] = [];
    const namedArgs: { name: string; value: SurfaceExpr }[] = [];
    let sawNamed = false;
    while (true) {
      if (this.current().kind === "identifier" && this.peekAhead(1, ":=")) {
        if (explicitMode) throw new ProofScriptError("PS0222", "Named arguments are not combined with '@' explicit application in the v0.10 slice; supply all exposed binders positionally.");
        sawNamed = true;
        const argumentName = this.parseIdentifier();
        this.consume(":=");
        namedArgs.push({ name: argumentName, value: this.parseExpression() });
      } else {
        if (sawNamed) throw new ProofScriptError("PS0218", "Positional arguments after named arguments are not supported by the v0.10 application slice.");
        args.push(this.parseExpression());
      }
      if (this.peek(",")) { this.consume(","); continue; }
      break;
    }
    this.consume(")");
    return {
      kind: "call",
      callee: name,
      args,
      ...(namedArgs.length === 0 ? {} : { namedArgs }),
      ...(explicitMode ? { explicitMode: true } : {}),
      ...(universeArgs.length === 0 ? {} : { universeArgs }),
    };
  }

  private parseQualifiedIdentifier(): string {
    let name = this.parseIdentifier();
    while (this.peek("::") || (this.peek(".") && !this.peekAhead(1, "{"))) {
      const separator = this.consume();
      name += `${separator}${this.parseIdentifier()}`;
    }
    return name;
  }

  private surfaceTypeSource(type: SurfaceTypeExpr): string {
    switch (type.kind) {
      case "term": return this.surfaceExprSource(type.expr);
      case "sort": return type.sort === "Prop" ? "Prop" : `${type.sort}${type.level ? ` ${this.surfaceUniverseSource(type.level)}` : ""}`;
      case "arrow": return `${this.surfaceTypeSource(type.domain)} → ${this.surfaceTypeSource(type.codomain)}`;
      case "pi": return `${type.params.map((param) => `${param.name}: ${this.surfaceTypeSource(param.type)}`).join(", ")} → ${this.surfaceTypeSource(type.codomain)}`;
    }
  }

  private surfaceUniverseSource(level: SurfaceUniverseLevel): string {
    switch (level.kind) {
      case "zero": return "0";
      case "param": return level.name;
      case "succ": return `${this.surfaceUniverseSource(level.base)} + ${level.amount}`;
      case "max": return `max ${this.surfaceUniverseSource(level.left)} ${this.surfaceUniverseSource(level.right)}`;
      case "imax": return `imax ${this.surfaceUniverseSource(level.left)} ${this.surfaceUniverseSource(level.right)}`;
    }
  }

  private surfaceExprSource(expr: SurfaceExpr): string {
    switch (expr.kind) {
      case "identifier": return expr.name;
      case "number": return expr.text;
      case "string": return expr.text;
      case "call": {
        const universes = expr.universeArgs?.length ? `.{${expr.universeArgs.map((level) => this.surfaceUniverseSource(level)).join(", ")}}` : "";
        return `${expr.explicitMode ? "@" : ""}${expr.callee}${universes}(${[...expr.args.map((arg) => this.surfaceExprSource(arg)), ...(expr.namedArgs ?? []).map((arg) => `${arg.name} := ${this.surfaceExprSource(arg.value)}`)].join(",")})`;
      }
      case "lambda": return `fun ${expr.params.map((param) => `(${param.name}: ${this.surfaceTypeSource(param.type)})`).join(" ")} => ${this.surfaceExprSource(expr.body)}`;
      case "quantifier": return `${expr.quantifier === "forall" ? "∀" : "∃"} ${expr.params.map((param) => `(${param.name}: ${this.surfaceTypeSource(param.type)})`).join(" ")}, ${this.surfaceExprSource(expr.body)}`;
      case "binary": return `${this.surfaceExprSource(expr.left)}${expr.operator}${this.surfaceExprSource(expr.right)}`;
      case "extension": return `<${expr.owner}>`;
    }
  }

  private current(): Token {
    const token = this.tokens[this.index];
    if (!token) throw new ProofScriptError("PS0299", "Parser cursor moved past end of token stream.");
    return token;
  }
}
