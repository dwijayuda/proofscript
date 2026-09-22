import { ProofScriptError } from "../../core/errors.js";
import type { DeclarationElaborationContext, ParserCursor, PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import type { IREquationPattern, IRExpr, IRType, SurfaceExpr, SurfaceTypeExpr } from "../../core/model.js";
import { makeTypeTerm, sameType } from "../../core/type-utils.js";
import { decisionForProposition } from "./conditionals.js";
import { isPatternIrrefutable, parsePattern, parsePatternSequence, renderPattern, validateSingleDiscriminantPatternCoverage, withPatternSequenceContext, type SurfacePattern } from "./pattern-engine.js";

interface DoForInDescriptor {
  readonly family: string;
  readonly sourceName: string;
  readonly typeArgumentIndex: number;
  readonly membershipProof?: boolean;
  readonly typescriptRuntime?: "readonly-array";
}

interface DoMonadDescriptor {
  readonly family: string;
  readonly sourceName: string;
  readonly typeArgumentIndex: number;
  /** The monad supports Lean's implicit failure path for refutable pattern binds. */
  readonly patternFailure?: "alternative";
}

type SurfaceDoElem =
  | { readonly kind: "let"; readonly name: string; readonly annotation?: SurfaceTypeExpr; readonly value: SurfaceExpr }
  | { readonly kind: "mut"; readonly name: string; readonly annotation?: SurfaceTypeExpr; readonly value: SurfaceExpr }
  | { readonly kind: "assign"; readonly name: string; readonly value: SurfaceExpr }
  | { readonly kind: "bind"; readonly name: string; readonly annotation?: SurfaceTypeExpr; readonly action: SurfaceExpr }
  | {
      readonly kind: "patternBind";
      readonly pattern: SurfacePattern;
      readonly annotation?: SurfaceTypeExpr;
      readonly action: SurfaceExpr;
      /** ProofScript brace-shaped surface for Lean's `| doSeqIndent` fallback. */
      readonly fallbackElements?: readonly SurfaceDoElem[];
    }
  | { readonly kind: "action"; readonly action: SurfaceExpr }
  | { readonly kind: "return"; readonly value?: SurfaceExpr }
  | {
      readonly kind: "branch";
      readonly form: "if" | "unless";
      readonly condition: SurfaceExpr;
      readonly thenElements: readonly SurfaceDoElem[];
      readonly elseElements?: readonly SurfaceDoElem[];
    }
  | {
      readonly kind: "match";
      readonly discriminant: SurfaceExpr;
      readonly dependent?: boolean;
      readonly alternatives: readonly {
        readonly sequences: readonly (readonly SurfacePattern[])[];
        readonly elements: readonly SurfaceDoElem[];
      }[];
    }
  | {
      readonly kind: "loop";
      readonly form: "while" | "repeatUntil" | "repeat";
      readonly condition?: SurfaceExpr;
      readonly bodyElements: readonly SurfaceDoElem[];
    }
  | {
      readonly kind: "patternLoop";
      readonly mode: "pure" | "monadic";
      readonly pattern: SurfacePattern;
      readonly source: SurfaceExpr;
      readonly bodyElements: readonly SurfaceDoElem[];
    }
  | { readonly kind: "break" }
  | {
      readonly kind: "for";
      readonly pattern: SurfacePattern;
      readonly collection: SurfaceExpr;
      readonly membershipProofName?: string;
      readonly bodyElements: readonly SurfaceDoElem[];
    }
  | { readonly kind: "continue" };

interface SurfaceDoPayload { readonly elements: readonly SurfaceDoElem[]; }
interface SurfaceTermReturnPayload { readonly value?: SurfaceExpr; }
interface SurfaceDoForwardPayload { readonly elements: readonly SurfaceDoElem[]; }

type IRDoElem =
  | { readonly kind: "let"; readonly name: string; readonly binderType: IRType; readonly annotated: boolean; readonly argIndex: number }
  | { readonly kind: "mut"; readonly name: string; readonly binderType: IRType; readonly annotated: boolean; readonly argIndex: number }
  | { readonly kind: "assign"; readonly name: string; readonly binderType: IRType; readonly argIndex: number }
  | { readonly kind: "bind"; readonly name: string; readonly binderType: IRType; readonly annotated: boolean; readonly argIndex: number }
  | {
      readonly kind: "patternBind";
      readonly pattern: IREquationPattern;
      readonly binderType: IRType;
      readonly annotated: boolean;
      readonly actionArgIndex: number;
      readonly irrefutable: boolean;
      readonly implicitFailure: boolean;
      readonly fallbackElements?: readonly IRDoElem[];
      readonly continuationElements: readonly IRDoElem[];
    }
  | { readonly kind: "action"; readonly argIndex: number }
  | { readonly kind: "return"; readonly argIndex?: number }
  | {
      readonly kind: "branch";
      readonly form: "if" | "unless";
      readonly conditionArgIndex: number;
      readonly decision: "bool" | "eq" | "instance";
      readonly thenElements: readonly IRDoElem[];
      readonly elseElements?: readonly IRDoElem[];
      /** Final missing branch completes with pure Unit. */
      readonly finalUnitFallback?: boolean;
    }
  | {
      readonly kind: "match";
      readonly discriminantArgIndex: number;
      readonly dependent: boolean;
      readonly cases: readonly {
        readonly patterns: readonly IREquationPattern[];
        readonly elements: readonly IRDoElem[];
      }[];
    }
  | {
      readonly kind: "loop";
      readonly form: "while" | "repeatUntil" | "repeat";
      readonly conditionArgIndex?: number;
      readonly decision?: "bool" | "eq" | "instance";
      readonly bodyElements: readonly IRDoElem[];
      readonly finalUnit?: boolean;
    }
  | {
      readonly kind: "patternLoop";
      readonly mode: "pure" | "monadic";
      readonly pattern: IREquationPattern;
      readonly sourceArgIndex: number;
      readonly binderType: IRType;
      readonly bodyElements: readonly IRDoElem[];
      readonly finalUnit?: boolean;
    }
  | { readonly kind: "break" }
  | {
      readonly kind: "for";
      readonly pattern: IREquationPattern;
      readonly collectionArgIndex: number;
      readonly collectionType: IRType;
      readonly elementType: IRType;
      readonly membershipProofName?: string;
      readonly bodyElements: readonly IRDoElem[];
      readonly finalUnit?: boolean;
    }
  | { readonly kind: "continue" };

interface IRDoPayload {
  readonly monadFamily: string;
  readonly resultType: IRType;
  readonly elements: readonly IRDoElem[];
}
interface IRTermReturnPayload { readonly monadFamily: string; readonly resultType: IRType; readonly bare: boolean; }
interface IRDoForwardPayload {
  readonly monadFamily: string;
  /** Normal/fallthrough result expected by the continuation-taking wrapper. */
  readonly resultType: IRType;
  /** Early `return` still targets the surrounding do block, not the wrapper body. */
  readonly outerResultType: IRType;
  readonly elements: readonly IRDoElem[];
  readonly implicitUnitFallthrough: boolean;
}

interface DoForwardAmbient {
  readonly elaborate: (elements: readonly SurfaceDoElem[], expected: IRType) => IRExpr;
}

const DO_FORWARD_AMBIENT_KEY = "proofscript.do.forward.ambient";

function parseDoBranchBlock(cursor: ParserCursor): readonly SurfaceDoElem[] {
  cursor.expect("{");
  const elements = parseDoElements(cursor);
  cursor.expect("}");
  return elements;
}

function parseDoIf(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("if");
  if (!cursor.peek("(")) {
    throw new ProofScriptError("PS2987", "Dependent do-if binders (`if h : p`) are Lean-native but deferred beyond the current do-control slice.");
  }
  cursor.consume("(");
  const condition = cursor.parseExpression();
  cursor.expect(")");
  const thenElements = parseDoBranchBlock(cursor);
  let elseElements: readonly SurfaceDoElem[] | undefined;
  if (cursor.peek("else")) {
    cursor.consume("else");
    if (cursor.peek("if")) elseElements = [parseDoIf(cursor)];
    else elseElements = parseDoBranchBlock(cursor);
  }
  return { kind: "branch", form: "if", condition, thenElements, ...(elseElements ? { elseElements } : {}) };
}

function parseDoUnless(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("unless");
  cursor.expect("(");
  const condition = cursor.parseExpression();
  cursor.expect(")");
  const thenElements = parseDoBranchBlock(cursor);
  return { kind: "branch", form: "unless", condition, thenElements };
}


function parseDoMatch(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("match");
  let dependent: boolean | undefined;
  if (cursor.peek("(") && cursor.peekAhead(1, "dependent")) {
    cursor.consume("(");
    cursor.expect("dependent");
    cursor.expect(":=");
    const value = cursor.consume();
    if (value !== "true" && value !== "false") throw new ProofScriptError("PS2990", "do match option 'dependent' expects true or false.");
    dependent = value === "true";
    cursor.expect(")");
  }
  cursor.expect("(");
  if (cursor.currentToken().kind === "identifier" && cursor.peekAhead(1, ":")) {
    throw new ProofScriptError("PS2991", "Named do-match discriminants are reference-defined but deferred beyond the v0.51 single-discriminant tranche.");
  }
  const discriminant = cursor.parseExpression();
  if (cursor.peek(",")) throw new ProofScriptError("PS2992", "v0.51 do-match currently supports exactly one discriminant; multiple discriminants remain on the dependent-pattern completion path.");
  cursor.expect(")");
  cursor.expect("{");
  const alternatives: { sequences: readonly (readonly SurfacePattern[])[]; elements: readonly SurfaceDoElem[] }[] = [];
  while (!cursor.peek("}")) {
    cursor.expect("|");
    const sequences: (readonly SurfacePattern[])[] = [parsePatternSequence(cursor)];
    while (cursor.peek("|")) {
      cursor.consume("|");
      sequences.push(parsePatternSequence(cursor));
    }
    cursor.expect("=>");
    const elements = parseDoElements(cursor, true);
    if (elements.length === 0) throw new ProofScriptError("PS2993", "A do-match alternative requires a nonempty doSeq RHS.");
    alternatives.push({ sequences, elements });
  }
  cursor.expect("}");
  if (alternatives.length === 0) throw new ProofScriptError("PS2994", "do match requires at least one alternative.");
  return { kind: "match", discriminant, ...(dependent !== undefined ? { dependent } : {}), alternatives };
}

function startsDoPatternBind(cursor: ParserCursor): boolean {
  const token = cursor.currentToken();
  if (cursor.peek(".") || cursor.peek("(") || token.kind === "number") return true;
  if (token.kind !== "identifier") return false;
  if (token.text === "_") return true;
  return cursor.peekAhead(1, "(") || cursor.peekAhead(1, "@");
}

function parsePatternBindFallback(cursor: ParserCursor): readonly SurfaceDoElem[] | undefined {
  if (!cursor.peek("|")) return undefined;
  cursor.consume("|");
  if (!cursor.peek("{")) {
    throw new ProofScriptError("PS2996", "ProofScript refutable do-bind fallback uses brace-shaped `| { ... }` syntax corresponding to Lean's `| doSeq` fallback.");
  }
  const elements = parseDoBranchBlock(cursor);
  if (elements.length === 0) throw new ProofScriptError("PS2997", "A refutable do-bind fallback requires a nonempty do sequence.");
  return elements;
}

function parseDoWhile(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("while");
  if (cursor.peek("let")) {
    cursor.consume("let");
    const pattern = parsePattern(cursor);
    let mode: "pure" | "monadic";
    if (cursor.peek(":=")) { cursor.consume(":="); mode = "pure"; }
    else if (cursor.peek("←") || cursor.peek("<-")) { cursor.consume(); mode = "monadic"; }
    else throw new ProofScriptError("PS29A0", "A while-let pattern condition requires ':=' for a pure source or '←'/'<-' for a monadic source.");
    const source = cursor.parseExpression();
    const bodyElements = parseDoBranchBlock(cursor);
    if (bodyElements.length === 0) throw new ProofScriptError("PS29A1", "A while-let loop requires a nonempty doSeq body.");
    return { kind: "patternLoop", mode, pattern, source, bodyElements };
  }
  cursor.expect("(");
  const condition = cursor.parseExpression();
  cursor.expect(")");
  const bodyElements = parseDoBranchBlock(cursor);
  if (bodyElements.length === 0) throw new ProofScriptError("PS29A1", "A while loop requires a nonempty doSeq body in the v0.52 loop foundation.");
  return { kind: "loop", form: "while", condition, bodyElements };
}

function parseDoRepeat(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("repeat");
  const bodyElements = parseDoBranchBlock(cursor);
  if (bodyElements.length === 0) throw new ProofScriptError("PS29A2", "A repeat loop requires a nonempty doSeq body.");
  if (cursor.peek("until")) {
    cursor.consume("until");
    const condition = cursor.parseExpression();
    cursor.expect(";");
    return { kind: "loop", form: "repeatUntil", condition, bodyElements };
  }
  return { kind: "loop", form: "repeat", bodyElements };
}

function parseDoFor(cursor: ParserCursor): SurfaceDoElem {
  cursor.consume("for");
  cursor.expect("(");
  let membershipProofName: string | undefined;
  if (cursor.currentToken().kind === "identifier" && cursor.peekAhead(1, ":")) {
    membershipProofName = cursor.parseIdentifier();
    cursor.expect(":");
  }
  const pattern = parsePattern(cursor);
  cursor.expect("in");
  const collection = cursor.parseExpression();
  if (cursor.peek(",")) throw new ProofScriptError("PS29B1", "Parallel/multi-collection for iteration is Lean-native but deferred until ToStream correspondence is implemented.");
  cursor.expect(")");
  const bodyElements = parseDoBranchBlock(cursor);
  if (bodyElements.length === 0) throw new ProofScriptError("PS29B2", "A for loop requires a nonempty doSeq body.");
  return { kind: "for", pattern, collection, ...(membershipProofName ? { membershipProofName } : {}), bodyElements };
}

function parseDoElements(cursor: ParserCursor, stopOnAlternative = false): SurfaceDoElem[] {
  const elements: SurfaceDoElem[] = [];
  while (!cursor.peek("}") && !(stopOnAlternative && cursor.peek("|"))) {
    if (!cursor.peek()) throw new ProofScriptError("PS2961", "Unexpected end of input inside do block.");
    if (cursor.peek("let")) {
      cursor.consume("let");
      const mutable = cursor.peek("mut");
      if (mutable) cursor.consume("mut");

      if (!mutable && startsDoPatternBind(cursor)) {
        const pattern = parsePattern(cursor);
        let annotation: SurfaceTypeExpr | undefined;
        if (cursor.peek(":")) { cursor.consume(":"); annotation = cursor.parseTypeExpression(); }
        if (!(cursor.peek("←") || cursor.peek("<-"))) {
          throw new ProofScriptError("PS2963", "A pattern after `let` inside `do` currently requires monadic bind syntax `←`/`<-`; pure pattern-let remains owned by the local-binding feature.");
        }
        cursor.consume();
        const action = cursor.parseExpression();
        const fallbackElements = parsePatternBindFallback(cursor);
        if (cursor.peek(";")) cursor.consume(";");
        else if (!fallbackElements) cursor.expect(";");
        elements.push({ kind: "patternBind", pattern, ...(annotation ? { annotation } : {}), action, ...(fallbackElements ? { fallbackElements } : {}) });
        continue;
      }

      const name = cursor.parseIdentifier();
      let annotation: SurfaceTypeExpr | undefined;
      if (cursor.peek(":")) { cursor.consume(":"); annotation = cursor.parseTypeExpression(); }
      if (mutable) {
        if (cursor.peek("←") || cursor.peek("<-")) throw new ProofScriptError("PS2962", "'let mut' is a pure mutable-local declaration and cannot use monadic bind syntax; bind first, then initialize the mutable local.");
        cursor.expect(":=");
        const value = cursor.parseExpression();
        cursor.expect(";");
        elements.push({ kind: "mut", name, ...(annotation ? { annotation } : {}), value });
      } else if (cursor.peek("←") || cursor.peek("<-")) {
        cursor.consume();
        const action = cursor.parseExpression();
        cursor.expect(";");
        elements.push({ kind: "bind", name, ...(annotation ? { annotation } : {}), action });
      } else {
        cursor.expect(":=");
        const value = cursor.parseExpression();
        cursor.expect(";");
        elements.push({ kind: "let", name, ...(annotation ? { annotation } : {}), value });
      }
      continue;
    }
    if (cursor.peekAhead(1, ":=")) {
      const name = cursor.parseIdentifier();
      cursor.expect(":=");
      const value = cursor.parseExpression();
      cursor.expect(";");
      elements.push({ kind: "assign", name, value });
      continue;
    }
    if (cursor.peek("return")) {
      cursor.consume("return");
      if (cursor.peek(";")) {
        cursor.consume(";");
        elements.push({ kind: "return" });
      } else {
        const value = cursor.parseExpression();
        cursor.expect(";");
        elements.push({ kind: "return", value });
      }
      continue;
    }
    if (cursor.peek("if")) {
      elements.push(parseDoIf(cursor));
      continue;
    }
    if (cursor.peek("unless")) {
      elements.push(parseDoUnless(cursor));
      continue;
    }
    if (cursor.peek("bif")) {
      throw new ProofScriptError("PS2988", "Lean 4.33 do-notation has do-if and do-unless control elements, but no distinct do-bif element; use ordinary bif as a term where appropriate or a do-if condition with a proposition.");
    }
    if (cursor.peek("match")) {
      elements.push(parseDoMatch(cursor));
      continue;
    }
    if (cursor.peek("while")) {
      elements.push(parseDoWhile(cursor));
      continue;
    }
    if (cursor.peek("repeat")) {
      elements.push(parseDoRepeat(cursor));
      continue;
    }
    if (cursor.peek("break") || cursor.peek("continue")) {
      const kind = cursor.consume() as "break" | "continue";
      cursor.expect(";");
      elements.push({ kind });
      continue;
    }
    if (cursor.peek("for")) {
      elements.push(parseDoFor(cursor));
      continue;
    }
    const action = cursor.parseExpression();
    cursor.expect(";");
    elements.push({ kind: "action", action });
  }
  return elements;
}

/**
 * ProofScript uses braces as its structural replacement for Lean's
 * indentation-delimited `doSeq`.  For ergonomic parity with Lean's common
 * single-element `do← body` examples, v0.55 also accepts a single forwarded
 * control/action element without braces.  Multi-element forwarded bodies use
 * `do← { ... }` / `do<- { ... }`.
 */
function parseDoForwardBody(cursor: ParserCursor): readonly SurfaceDoElem[] {
  if (cursor.peek("{")) {
    const elements = parseDoBranchBlock(cursor);
    if (elements.length === 0) throw new ProofScriptError("PS29C1", "do←/do<- requires a nonempty forwarded doSeq body.");
    return elements;
  }
  if (cursor.peek("return")) {
    cursor.consume("return");
    if (cursor.peek(")") || cursor.peek(",")) return [{ kind: "return" }];
    const value = cursor.parseExpression();
    return [{ kind: "return", value }];
  }
  if (cursor.peek("break") || cursor.peek("continue")) {
    const kind = cursor.consume() as "break" | "continue";
    return [{ kind }];
  }
  if (cursor.peek("if")) return [parseDoIf(cursor)];
  if (cursor.peek("unless")) return [parseDoUnless(cursor)];
  if (cursor.peek("match")) return [parseDoMatch(cursor)];
  if (cursor.peek("while")) return [parseDoWhile(cursor)];
  if (cursor.peek("repeat")) return [parseDoRepeat(cursor)];
  if (cursor.peek("for")) return [parseDoFor(cursor)];
  if (cursor.currentToken().kind === "identifier" && cursor.peekAhead(1, ":=")) {
    const name = cursor.parseIdentifier();
    cursor.expect(":=");
    const value = cursor.parseExpression();
    return [{ kind: "assign", name, value }];
  }
  if (cursor.peek("let")) {
    throw new ProofScriptError("PS29C2", "A forwarded body beginning with 'let' must use structural braces: `do← { let ...; ... }`.");
  }
  const action = cursor.parseExpression();
  return [{ kind: "action", action }];
}

function parseDo(cursor: ParserCursor): SurfaceExpr {
  if (cursor.peek("←") || cursor.peek("<-")) {
    cursor.consume();
    return { kind: "extension", owner: "lean.do.forward.syntax", payload: { elements: parseDoForwardBody(cursor) } satisfies SurfaceDoForwardPayload };
  }
  cursor.expect("{");
  const elements = parseDoElements(cursor);
  cursor.expect("}");
  if (elements.length === 0) throw new ProofScriptError("PS2965", "A do block must contain at least one do element.");
  return { kind: "extension", owner: "lean.do.syntax", payload: { elements } satisfies SurfaceDoPayload };
}

function parseTermReturn(cursor: ParserCursor): SurfaceExpr {
  if (cursor.peek(";")) return { kind: "extension", owner: "lean.term.return.syntax", payload: {} satisfies SurfaceTermReturnPayload };
  return { kind: "extension", owner: "lean.term.return.syntax", payload: { value: cursor.parseExpression() } satisfies SurfaceTermReturnPayload };
}

function descriptorFor(type: IRType | undefined, context: DeclarationElaborationContext): DoMonadDescriptor {
  if (!type) throw new ProofScriptError("PS2966", "do/return requires an expected monadic result type in the current do tranche.");
  const semanticType = context.reduceTypeForComparison(type);
  if (!semanticType.family) throw new ProofScriptError("PS2966", "do/return requires an expected monadic result type in the current do tranche.");
  const descriptor = context.getSemanticInfo<DoMonadDescriptor>(`proofscript.do.monad:${semanticType.family}`);
  if (!descriptor || descriptor.family !== semanticType.family) {
    throw new ProofScriptError("PS2967", `Type '${type.displayName}' has no installed ProofScript do-monad descriptor.`);
  }
  return descriptor;
}

function innerType(type: IRType, descriptor: DoMonadDescriptor, context: DeclarationElaborationContext): IRType {
  const semanticType = context.reduceTypeForComparison(type);
  const argument = semanticType.args?.[descriptor.typeArgumentIndex];
  if (!argument || argument.kind !== "type") throw new ProofScriptError("PS2968", `Malformed monadic type '${type.displayName}' for do elaboration.`);
  return argument.value;
}

function ensureSameMonad(action: IRExpr, descriptor: DoMonadDescriptor, context: DeclarationElaborationContext): IRType {
  const semanticType = context.reduceTypeForComparison(action.type);
  if (semanticType.family !== descriptor.family) {
    throw new ProofScriptError("PS2969", `do action has type '${action.type.displayName}', expected monad family '${descriptor.sourceName}'.`);
  }
  return innerType(semanticType, descriptor, context);
}

function surfaceContainsDoForward(expr: SurfaceExpr): boolean {
  if (expr.kind === "extension") return expr.owner === "lean.do.forward.syntax";
  if (expr.kind === "call") return expr.args.some(surfaceContainsDoForward) || (expr.namedArgs ?? []).some((arg) => surfaceContainsDoForward(arg.value));
  if (expr.kind === "binary") return surfaceContainsDoForward(expr.left) || surfaceContainsDoForward(expr.right);
  if (expr.kind === "lambda" || expr.kind === "quantifier") return surfaceContainsDoForward(expr.body);
  return false;
}

/** Lean 4.32+ permits `do← body` specifically as the last argument of an
 * application inside a surrounding do block.  Validate this surface invariant
 * before ordinary application elaboration so the extension elaborator never
 * sees an accidentally free-standing forwarding marker. */
function validateDoForwardPlacement(expr: SurfaceExpr, directLastArgument = false): void {
  if (expr.kind === "extension") {
    if (expr.owner === "lean.do.forward.syntax" && !directLastArgument) {
      throw new ProofScriptError("PS29C3", "do←/do<- must occur as the final positional argument of an application inside the surrounding do block.");
    }
    return;
  }
  if (expr.kind === "call") {
    for (let index = 0; index < expr.args.length; index += 1) {
      validateDoForwardPlacement(expr.args[index]!, index === expr.args.length - 1);
    }
    for (const named of expr.namedArgs ?? []) {
      if (surfaceContainsDoForward(named.value)) throw new ProofScriptError("PS29C4", "do←/do<- in named arguments is deferred; use it as the final positional application argument.");
      validateDoForwardPlacement(named.value, false);
    }
    return;
  }
  if (expr.kind === "binary") {
    validateDoForwardPlacement(expr.left, false);
    validateDoForwardPlacement(expr.right, false);
    return;
  }
  if (expr.kind === "lambda" || expr.kind === "quantifier") {
    if (surfaceContainsDoForward(expr.body)) throw new ProofScriptError("PS29C5", "do←/do<- cannot cross a nested lambda/quantifier scope in the v0.55 ambient-control model.");
    return;
  }
}

function elaborateDoForward(expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  if (expr.kind !== "extension" || expr.owner !== "lean.do.forward.syntax") throw new ProofScriptError("PS29C6", "Malformed do-effect-forwarding syntax node.");
  if (!expected) throw new ProofScriptError("PS29C7", "do←/do<- requires the expected monadic type supplied by its continuation-taking wrapper argument.");
  const ambient = context.getElaborationInfo<DoForwardAmbient>(DO_FORWARD_AMBIENT_KEY);
  if (!ambient) throw new ProofScriptError("PS29C8", "do←/do<- is only valid inside an explicit surrounding do block.");
  return ambient.elaborate((expr.payload as SurfaceDoForwardPayload).elements, expected);
}

function elaborateDo(expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  if (expr.kind !== "extension") throw new ProofScriptError("PS2970", "Malformed do syntax node.");
  const descriptor = descriptorFor(expected, context);
  const expectedMonad = expected!;
  const resultType = innerType(expectedMonad, descriptor, context);
  const surface = (expr.payload as SurfaceDoPayload).elements;
  const args: IRExpr[] = [];

  const elaborateSequence = (
    sequence: readonly SurfaceDoElem[],
    mutableLocals: ReadonlySet<string>,
    requireFinalResult: boolean,
    sequenceResultType: IRType = resultType,
    loopDepth = 0,
    earlyReturnType: IRType = sequenceResultType,
    argSink: IRExpr[] = args,
  ): readonly IRDoElem[] => {
    const output: IRDoElem[] = [];

    const elaborateAt = (index: number, currentMutable: ReadonlySet<string>): void => {
      if (index >= sequence.length) return;
      const element = sequence[index]!;
      const isLast = index === sequence.length - 1;
      const rootFinal = requireFinalResult && isLast;

      const elaborateExpr = (surfaceExpr: SurfaceExpr, expectedType?: IRType): IRExpr => {
        validateDoForwardPlacement(surfaceExpr);
        const previous = context.getElaborationInfo<DoForwardAmbient>(DO_FORWARD_AMBIENT_KEY);
        context.setElaborationInfo(DO_FORWARD_AMBIENT_KEY, {
          elaborate: (forwardedElements, forwardExpected) => {
            const forwardDescriptor = descriptorFor(forwardExpected, context);
            if (forwardDescriptor.family !== descriptor.family) {
              throw new ProofScriptError("PS29C9", `do←/do<- wrapper argument uses monad '${forwardDescriptor.sourceName}', but the surrounding do block uses '${descriptor.sourceName}'. Cross-monad effect forwarding is deferred.`);
            }
            const forwardResultType = innerType(forwardExpected, forwardDescriptor, context);
            const forwardArgs: IRExpr[] = [];
            const last = forwardedElements.at(-1);
            const implicitUnitFallthrough = forwardResultType.id === "Unit" && !!last && (last.kind === "assign" || last.kind === "break" || last.kind === "continue");
            const forwardBody = elaborateSequence(
              forwardedElements,
              new Set(currentMutable),
              !implicitUnitFallthrough,
              forwardResultType,
              loopDepth,
              earlyReturnType,
              forwardArgs,
            );
            return {
              kind: "extension",
              op: "lean.do.forward",
              args: forwardArgs,
              payload: {
                monadFamily: forwardDescriptor.family,
                resultType: forwardResultType,
                outerResultType: earlyReturnType,
                elements: forwardBody,
                implicitUnitFallthrough,
              } satisfies IRDoForwardPayload,
              type: forwardExpected,
            };
          },
        } satisfies DoForwardAmbient);
        try {
          return context.elaborateExpression(surfaceExpr, expectedType);
        } finally {
          context.setElaborationInfo(DO_FORWARD_AMBIENT_KEY, previous);
        }
      };

      if (element.kind === "let") {
        if (rootFinal) throw new ProofScriptError("PS2972", "A pure let cannot be the final do element; provide a final action or return.");
        const annotation = element.annotation ? context.resolveTypeExpression(element.annotation) : undefined;
        const value = elaborateExpr(element.value, annotation);
        const binderType = annotation ?? value.type;
        if (annotation && !sameType(annotation, value.type)) throw new ProofScriptError("PS2973", `do local '${element.name}' has type '${value.type.displayName}', expected '${annotation.displayName}'.`);
        const argIndex = argSink.push(value) - 1;
        output.push({ kind: "let", name: element.name, binderType, annotated: !!annotation, argIndex });
        if (!isLast) context.withLocal(element.name, binderType, () => elaborateAt(index + 1, currentMutable));
        return;
      }

      if (element.kind === "mut") {
        if (rootFinal) throw new ProofScriptError("PS2981", "A mutable local declaration cannot be the final do element; provide a final action or return.");
        const annotation = element.annotation ? context.resolveTypeExpression(element.annotation) : undefined;
        const value = elaborateExpr(element.value, annotation);
        const binderType = annotation ?? value.type;
        if (annotation && !sameType(annotation, value.type)) throw new ProofScriptError("PS2982", `mutable do local '${element.name}' has type '${value.type.displayName}', expected '${annotation.displayName}'.`);
        const argIndex = argSink.push(value) - 1;
        output.push({ kind: "mut", name: element.name, binderType, annotated: !!annotation, argIndex });
        const nextMutable = new Set(currentMutable);
        nextMutable.add(element.name);
        if (!isLast) context.withLocal(element.name, binderType, () => elaborateAt(index + 1, nextMutable));
        return;
      }

      if (element.kind === "assign") {
        if (rootFinal) throw new ProofScriptError("PS2983", "Assignment cannot be the final do element; provide a final action or return.");
        if (!currentMutable.has(element.name)) throw new ProofScriptError("PS2984", `Cannot assign to '${element.name}': only locals introduced by 'let mut' are mutable in ProofScript do notation.`);
        const binderType = context.currentLocals().get(element.name);
        if (!binderType) throw new ProofScriptError("PS2985", `Mutable local '${element.name}' is not in scope.`);
        const value = elaborateExpr(element.value, binderType);
        if (!sameType(value.type, binderType)) throw new ProofScriptError("PS2986", `Assignment to '${element.name}' has type '${value.type.displayName}', expected '${binderType.displayName}'.`);
        const argIndex = argSink.push(value) - 1;
        output.push({ kind: "assign", name: element.name, binderType, argIndex });
        if (!isLast) elaborateAt(index + 1, currentMutable);
        return;
      }

      if (element.kind === "bind") {
        if (rootFinal) throw new ProofScriptError("PS2974", "A monadic bind cannot be the final do element; provide a final action or return.");
        const action = elaborateExpr(element.action);
        const boundType = ensureSameMonad(action, descriptor, context);
        if (element.annotation) {
          const annotation = context.resolveTypeExpression(element.annotation);
          if (!sameType(annotation, boundType)) throw new ProofScriptError("PS2975", `do bind '${element.name}' yields '${boundType.displayName}', expected annotation '${annotation.displayName}'.`);
        }
        const argIndex = argSink.push(action) - 1;
        output.push({ kind: "bind", name: element.name, binderType: boundType, annotated: !!element.annotation, argIndex });
        if (!isLast) context.withLocal(element.name, boundType, () => elaborateAt(index + 1, currentMutable));
        return;
      }

      if (element.kind === "patternBind") {
        if (isLast) throw new ProofScriptError("PS2998", "A monadic pattern bind requires a success continuation after the bind.");
        const action = elaborateExpr(element.action);
        const boundType = ensureSameMonad(action, descriptor, context);
        if (element.annotation) {
          const annotation = context.resolveTypeExpression(element.annotation);
          if (!sameType(annotation, boundType)) throw new ProofScriptError("PS2999", `do pattern bind yields '${boundType.displayName}', expected annotation '${annotation.displayName}'.`);
        }
        const irrefutable = isPatternIrrefutable(element.pattern, boundType, context);
        const hasFallback = element.fallbackElements !== undefined;
        if (!irrefutable && !hasFallback && descriptor.patternFailure !== "alternative") {
          throw new ProofScriptError("PS299A", `Refutable monadic pattern bind requires an explicit fallback for monad '${descriptor.sourceName}', which has no registered pattern-failure semantics.`);
        }
        const actionArgIndex = argSink.push(action) - 1;
        const synthetic: IRExpr = { kind: "var", name: `__proofscript_pattern_bind_${actionArgIndex}`, type: boundType };
        const success = withPatternSequenceContext(
          [synthetic],
          [element.pattern],
          sequenceResultType,
          context,
          (refinedResult) => elaborateSequence(
            sequence.slice(index + 1),
            new Set(currentMutable),
            requireFinalResult,
            refinedResult,
            loopDepth,
            sameType(earlyReturnType, sequenceResultType) ? refinedResult : earlyReturnType,
            argSink,
          ),
        );
        const fallbackElements = element.fallbackElements === undefined
          ? undefined
          : elaborateSequence(element.fallbackElements, new Set(currentMutable), true, sequenceResultType, loopDepth, earlyReturnType, argSink);
        output.push({
          kind: "patternBind",
          pattern: success.patterns[0]!,
          binderType: boundType,
          annotated: !!element.annotation,
          actionArgIndex,
          irrefutable,
          implicitFailure: !irrefutable && !hasFallback,
          ...(fallbackElements ? { fallbackElements } : {}),
          continuationElements: success.value,
        });
        return;
      }

    if (element.kind === "return") {
        if (!element.value) {
          if (earlyReturnType.id !== "Unit") throw new ProofScriptError("PS2976", `Bare do 'return;' requires monadic result Unit for the surrounding early-return target, got '${earlyReturnType.displayName}'.`);
          output.push({ kind: "return" });
        } else {
          const value = elaborateExpr(element.value, earlyReturnType);
          const argIndex = argSink.push(value) - 1;
          output.push({ kind: "return", argIndex });
        }
        if (!isLast) elaborateAt(index + 1, currentMutable); // type-check unreachable continuation too
        return;
      }

      if (element.kind === "branch") {
        const finalUnitFallback = rootFinal && sequenceResultType.id === "Unit";
        if (rootFinal && !finalUnitFallback && (element.form !== "if" || element.elseElements === undefined)) {
          throw new ProofScriptError("PS2989", "A final non-Unit do-control branch requires `if ... else ...` with both branches producing the monadic result; missing-else/unless completion is only valid for Unit results.");
        }
        let condition: IRExpr;
        let decision: "bool" | "eq" | "instance";
        if (element.form === "unless") {
          const bool = context.resolveType("Bool");
          condition = elaborateExpr(element.condition, bool);
          decision = "bool";
        } else {
          const prop = context.resolveType("Prop");
          condition = elaborateExpr(element.condition, prop);
          decision = decisionForProposition(condition, context).kind;
        }
        const conditionArgIndex = argSink.push(condition) - 1;
        const branchMustReturn = rootFinal && !finalUnitFallback;
        const thenElements = elaborateSequence(element.thenElements, new Set(currentMutable), branchMustReturn, sequenceResultType, loopDepth, earlyReturnType, argSink);
        const elseElements = element.elseElements === undefined
          ? undefined
          : elaborateSequence(element.elseElements, new Set(currentMutable), branchMustReturn, sequenceResultType, loopDepth, earlyReturnType, argSink);
        output.push({
          kind: "branch",
          form: element.form,
          conditionArgIndex,
          decision,
          thenElements,
          ...(elseElements !== undefined ? { elseElements } : {}),
          ...(finalUnitFallback ? { finalUnitFallback: true } : {}),
        });
        if (!rootFinal) elaborateAt(index + 1, currentMutable);
        return;
      }

      if (element.kind === "match") {
        const discriminant = elaborateExpr(element.discriminant);
        validateSingleDiscriminantPatternCoverage(discriminant, element.alternatives, context);
        const discriminantArgIndex = argSink.push(discriminant) - 1;
        const cases: { patterns: readonly IREquationPattern[]; elements: readonly IRDoElem[] }[] = [];
        for (const alternative of element.alternatives) {
          for (const sequencePatterns of alternative.sequences) {
            const branch = withPatternSequenceContext(
              [discriminant],
              sequencePatterns,
              sequenceResultType,
              context,
              (refinedResult) => elaborateSequence(
                alternative.elements,
                new Set(currentMutable),
                rootFinal,
                element.dependent ? refinedResult : sequenceResultType,
                loopDepth,
                element.dependent && sameType(earlyReturnType, sequenceResultType) ? refinedResult : earlyReturnType,
                argSink,
              ),
            );
            cases.push({ patterns: branch.patterns, elements: branch.value });
          }
        }
        output.push({ kind: "match", discriminantArgIndex, dependent: element.dependent ?? false, cases });
        if (!rootFinal) elaborateAt(index + 1, currentMutable);
        return;
      }

      if (element.kind === "for") {
        if (rootFinal && sequenceResultType.id !== "Unit") throw new ProofScriptError("PS29B3", "A final for loop is only valid when the surrounding do result is Unit; otherwise provide an explicit continuation/result after the loop.");
        const collection = elaborateExpr(element.collection);
        const family = collection.type.family;
        const forIn = family ? context.getSemanticInfo<DoForInDescriptor>(`proofscript.do.forin:${family}`) : undefined;
        if (!forIn || forIn.family !== family) {
          throw new ProofScriptError("PS29B4", `Collection type '${collection.type.displayName}' has no installed ProofScript ForIn descriptor.`);
        }
        const elementArg = collection.type.args?.[forIn.typeArgumentIndex];
        if (!elementArg || elementArg.kind !== "type") throw new ProofScriptError("PS29B5", `Malformed ForIn collection type '${collection.type.displayName}'.`);
        const elementType = elementArg.value;
        if (element.membershipProofName && !forIn.membershipProof) {
          throw new ProofScriptError("PS29B6", `Collection type '${collection.type.displayName}' has no registered ForIn' membership-proof support.`);
        }
        if (!isPatternIrrefutable(element.pattern, elementType, context)) {
          throw new ProofScriptError("PS29B7", "Patterns in Lean for-loop binders must match every collection element; refutable patterns are not implicit filters.");
        }
        const collectionArgIndex = argSink.push(collection) - 1;
        const synthetic: IRExpr = { kind: "var", name: `__proofscript_for_${collectionArgIndex}`, type: elementType };
        const body = withPatternSequenceContext(
          [synthetic],
          [element.pattern],
          sequenceResultType,
          context,
          (_refined) => {
            const elaborateBody = () => elaborateSequence(element.bodyElements, new Set(currentMutable), false, sequenceResultType, loopDepth + 1, earlyReturnType, argSink);
            if (!element.membershipProofName) return elaborateBody();
            const prop = context.resolveType("Prop");
            const membershipExpr: IRExpr = { kind: "op", op: "lean.membership", args: [synthetic, collection], type: prop };
            const membershipType = makeTypeTerm(membershipExpr);
            return context.withLocal(element.membershipProofName, membershipType, elaborateBody);
          },
        );
        output.push({
          kind: "for",
          pattern: body.patterns[0]!,
          collectionArgIndex,
          collectionType: collection.type,
          elementType,
          ...(element.membershipProofName ? { membershipProofName: element.membershipProofName } : {}),
          bodyElements: body.value,
          ...(rootFinal ? { finalUnit: true } : {}),
        });
        if (!isLast) elaborateAt(index + 1, currentMutable);
        return;
      }

    if (element.kind === "loop") {
        if (rootFinal && sequenceResultType.id !== "Unit") throw new ProofScriptError("PS29A3", "A final loop is only valid when the surrounding do result is Unit; otherwise provide an explicit continuation/result after the loop.");
        let conditionArgIndex: number | undefined;
        let decision: "bool" | "eq" | "instance" | undefined;
        if (element.condition) {
          const prop = context.resolveType("Prop");
          const condition = elaborateExpr(element.condition, prop);
          decision = decisionForProposition(condition, context).kind;
          conditionArgIndex = argSink.push(condition) - 1;
        }
        const bodyElements = elaborateSequence(element.bodyElements, new Set(currentMutable), false, sequenceResultType, loopDepth + 1, earlyReturnType, argSink);
        output.push({
          kind: "loop",
          form: element.form,
          ...(conditionArgIndex !== undefined ? { conditionArgIndex } : {}),
          ...(decision !== undefined ? { decision } : {}),
          bodyElements,
          ...(rootFinal ? { finalUnit: true } : {}),
        });
        if (!isLast) elaborateAt(index + 1, currentMutable);
        return;
      }

      if (element.kind === "patternLoop") {
        if (rootFinal && sequenceResultType.id !== "Unit") throw new ProofScriptError("PS29A6", "A final while-let loop is only valid when the surrounding do result is Unit; otherwise provide an explicit continuation/result after the loop.");
        const source = elaborateExpr(element.source);
        const binderType = element.mode === "monadic" ? ensureSameMonad(source, descriptor, context) : source.type;
        const sourceArgIndex = argSink.push(source) - 1;
        const synthetic: IRExpr = { kind: "var", name: `__proofscript_while_pattern_${sourceArgIndex}`, type: binderType };
        const body = withPatternSequenceContext(
          [synthetic],
          [element.pattern],
          sequenceResultType,
          context,
          (_refined) => elaborateSequence(element.bodyElements, new Set(currentMutable), false, sequenceResultType, loopDepth + 1, earlyReturnType, argSink),
        );
        output.push({
          kind: "patternLoop",
          mode: element.mode,
          pattern: body.patterns[0]!,
          sourceArgIndex,
          binderType,
          bodyElements: body.value,
          ...(rootFinal ? { finalUnit: true } : {}),
        });
        if (!isLast) elaborateAt(index + 1, currentMutable);
        return;
      }

      if (element.kind === "break" || element.kind === "continue") {
        if (loopDepth <= 0) throw new ProofScriptError("PS29A4", `'${element.kind}' is only valid inside the nearest enclosing do loop.`);
        if (!isLast) throw new ProofScriptError("PS29A5", `'${element.kind}' must terminate its immediate loop-body doSeq branch in the v0.52 control model.`);
        output.push({ kind: element.kind });
        return;
      }

      const action = elaborateExpr(element.action, rootFinal ? expectedMonad : undefined);
      ensureSameMonad(action, descriptor, context);
      if (rootFinal && !context.typesDefinitionallyEqual(action.type, expectedMonad)) {
        throw new ProofScriptError("PS2977", `Final do action has type '${action.type.displayName}', expected '${expectedMonad.displayName}'.`);
      }
      const argIndex = argSink.push(action) - 1;
      output.push({ kind: "action", argIndex });
      if (!isLast) elaborateAt(index + 1, currentMutable);
    };

    elaborateAt(0, mutableLocals);
    if (requireFinalResult) {
      const last = output.at(-1);
      if (!last || (last.kind !== "action" && last.kind !== "return" && last.kind !== "patternBind" && last.kind !== "branch" && last.kind !== "match" && last.kind !== "loop" && last.kind !== "patternLoop" && last.kind !== "for")) throw new ProofScriptError("PS2978", "do sequence requires a final action, return, or structured control continuation.");
    }
    return output;
  };

  const elements = elaborateSequence(surface, new Set(), true);
  return { kind: "extension", op: "lean.do.sequence", args, payload: { monadFamily: descriptor.family, resultType, elements } satisfies IRDoPayload, type: expectedMonad };
}

function elaborateTermReturn(expr: SurfaceExpr, expected: IRType | undefined, context: DeclarationElaborationContext): IRExpr {
  if (expr.kind !== "extension") throw new ProofScriptError("PS2979", "Malformed term return node.");
  const descriptor = descriptorFor(expected, context);
  const resultType = innerType(expected!, descriptor, context);
  const payload = expr.payload as SurfaceTermReturnPayload;
  if (!payload.value) throw new ProofScriptError("PS2980", "Bare term-level return requires Unit support and is deferred beyond the current term-return tranche.");
  const value = context.elaborateExpression(payload.value, resultType);
  return { kind: "extension", op: "lean.term.return", args: [value], payload: { monadFamily: descriptor.family, resultType, bare: false } satisfies IRTermReturnPayload, type: expected! };
}

function hasStructuredControl(elements: readonly IRDoElem[]): boolean {
  for (const element of elements) {
    if (element.kind === "branch") {
      if (hasStructuredControl(element.thenElements) || hasStructuredControl(element.elseElements ?? [])) return true;
      return true;
    }
    if (element.kind === "match") return true;
    if (element.kind === "patternBind") return true;
    if (element.kind === "loop" || element.kind === "patternLoop" || element.kind === "for") return true;
  }
  return false;
}

function emitLeanSimpleElement(element: Exclude<IRDoElem, { readonly kind: "branch" } | { readonly kind: "match" } | { readonly kind: "patternBind" } | { readonly kind: "loop" } | { readonly kind: "patternLoop" } | { readonly kind: "for" }> , expr: Extract<IRExpr, { kind: "extension" }>, context: import("../../core/model.js").EmitContext): string {
  if (element.kind === "let") {
    const type = element.annotated ? ` : ${context.emitType(element.binderType)}` : "";
    return `let ${element.name}${type} := ${context.emitExpr(expr.args[element.argIndex]!)}`;
  }
  if (element.kind === "mut") {
    const type = element.annotated ? ` : ${context.emitType(element.binderType)}` : "";
    return `let mut ${element.name}${type} := ${context.emitExpr(expr.args[element.argIndex]!)}`;
  }
  if (element.kind === "assign") return `${element.name} := ${context.emitExpr(expr.args[element.argIndex]!)}`;
  if (element.kind === "bind") {
    const type = element.annotated ? ` : ${context.emitType(element.binderType)}` : "";
    return `let ${element.name}${type} ← ${context.emitExpr(expr.args[element.argIndex]!)}`;
  }
  if (element.kind === "return") return element.argIndex === undefined ? "return" : `return ${context.emitExpr(expr.args[element.argIndex]!)}`;
  if (element.kind === "break" || element.kind === "continue") return element.kind;
  return context.emitExpr(expr.args[element.argIndex]!);
}

function emitLeanDoPattern(pattern: IREquationPattern, context: import("../../core/model.js").EmitContext): string {
  switch (pattern.kind) {
    case "constructor": return `.${pattern.variant}${pattern.fields.length ? ` ${pattern.fields.map((field) => emitLeanDoPattern(field, context)).join(" ")}` : ""}`;
    case "number": return pattern.value;
    case "wildcard": return "_";
    case "variable": return pattern.name;
    case "inaccessible": return `.(${context.emitExpr(pattern.term)})`;
    case "named": return `${pattern.name} @ ${pattern.equalityName ? `${pattern.equalityName} : ` : ""}${emitLeanDoPattern(pattern.pattern, context)}`;
  }
}

function emitLeanDoMultiline(expr: Extract<IRExpr, { kind: "extension" }>, elements: readonly IRDoElem[], context: import("../../core/model.js").EmitContext, indent: number): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  for (const element of elements) {
    if (element.kind === "patternBind") {
      const pattern = emitLeanDoPattern(element.pattern, context);
      const type = element.annotated ? ` : ${context.emitType(element.binderType)}` : "";
      const action = context.emitExpr(expr.args[element.actionArgIndex]!);
      lines.push(`${pad}let ${pattern}${type} ← ${action}`);
      if (element.fallbackElements) {
        const fallback = emitLeanDoMultiline(expr, element.fallbackElements, context, indent + 4);
        if (fallback.length === 0) throw new ProofScriptError("PS4964", "Internal empty pattern-bind fallback.");
        const first = fallback[0]!.trimStart();
        lines.push(`${" ".repeat(indent + 2)}| ${first}`);
        for (const line of fallback.slice(1)) lines.push(`${" ".repeat(indent + 4)}${line.trimStart()}`);
      }
      lines.push(...emitLeanDoMultiline(expr, element.continuationElements, context, indent));
      continue;
    }
    if (element.kind === "match") {
      const discriminant = context.emitExpr(expr.args[element.discriminantArgIndex]!);
      lines.push(`${pad}match${element.dependent ? " (dependent := true)" : ""} ${discriminant} with`);
      for (const item of element.cases) {
        lines.push(`${pad}| ${item.patterns.map((pattern) => emitLeanDoPattern(pattern, context)).join(", ")} =>`);
        const branch = emitLeanDoMultiline(expr, item.elements, context, indent + 2);
        lines.push(...(branch.length ? branch : [`${" ".repeat(indent + 2)}pure ()`]));
      }
      continue;
    }
    if (element.kind === "for") {
      const collection = context.emitExpr(expr.args[element.collectionArgIndex]!);
      const pattern = emitLeanDoPattern(element.pattern, context);
      const binder = element.membershipProofName ? `${element.membershipProofName} : ${pattern}` : pattern;
      lines.push(`${pad}for ${binder} in ${collection} do`);
      lines.push(...emitLeanDoMultiline(expr, element.bodyElements, context, indent + 2));
      continue;
    }
    if (element.kind === "patternLoop") {
      const source = context.emitExpr(expr.args[element.sourceArgIndex]!);
      const pattern = emitLeanDoPattern(element.pattern, context);
      lines.push(`${pad}while let ${pattern} ${element.mode === "monadic" ? "←" : ":="} ${source} do`);
      lines.push(...emitLeanDoMultiline(expr, element.bodyElements, context, indent + 2));
      continue;
    }
    if (element.kind === "loop") {
      if (element.form === "while") {
        const condition = context.emitExpr(expr.args[element.conditionArgIndex!]!);
        lines.push(`${pad}while ${condition} do`);
        lines.push(...emitLeanDoMultiline(expr, element.bodyElements, context, indent + 2));
      } else if (element.form === "repeatUntil") {
        const condition = context.emitExpr(expr.args[element.conditionArgIndex!]!);
        lines.push(`${pad}repeat`);
        lines.push(...emitLeanDoMultiline(expr, element.bodyElements, context, indent + 2));
        lines.push(`${pad}until ${condition}`);
      } else {
        lines.push(`${pad}repeat`);
        lines.push(...emitLeanDoMultiline(expr, element.bodyElements, context, indent + 2));
      }
      continue;
    }
    if (element.kind !== "branch") {
      lines.push(`${pad}${emitLeanSimpleElement(element, expr, context)}`);
      continue;
    }
    const condition = context.emitExpr(expr.args[element.conditionArgIndex]!);
    if (element.form === "unless") {
      lines.push(`${pad}unless ${condition} do`);
      const body = emitLeanDoMultiline(expr, element.thenElements, context, indent + 2);
      lines.push(...(body.length ? body : [`${" ".repeat(indent + 2)}pure ()`]));
      continue;
    }
    lines.push(`${pad}if ${condition} then`);
    const thenLines = emitLeanDoMultiline(expr, element.thenElements, context, indent + 2);
    lines.push(...(thenLines.length ? thenLines : [`${" ".repeat(indent + 2)}pure ()`]));
    if (element.elseElements !== undefined) {
      lines.push(`${pad}else`);
      const elseLines = emitLeanDoMultiline(expr, element.elseElements, context, indent + 2);
      lines.push(...(elseLines.length ? elseLines : [`${" ".repeat(indent + 2)}pure ()`]));
    }
  }
  return lines;
}

function emitLeanDo(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS4961", "Expected do IR node.");
  const payload = expr.payload as IRDoPayload;
  if (hasStructuredControl(payload.elements)) {
    return `(do\n${emitLeanDoMultiline(expr, payload.elements, context, 2).join("\n")}\n)`;
  }
  const parts = payload.elements.map((element) => {
    if (element.kind === "branch" || element.kind === "match" || element.kind === "patternBind" || element.kind === "loop" || element.kind === "patternLoop" || element.kind === "for") throw new ProofScriptError("PS4963", "Internal structured-control emitter mismatch.");
    return `${emitLeanSimpleElement(element, expr, context)};`;
  });
  return `(do { ${parts.join(" ")} })`;
}

function emitLeanTermReturn(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS4962", "Expected term return IR node.");
  return `(return ${context.emitExpr(expr.args[0]!)})`;
}

function emitLeanDoForward(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS4965", "Expected do-effect-forwarding IR node.");
  const payload = expr.payload as IRDoForwardPayload;
  if (payload.elements.length === 1) {
    const only = payload.elements[0]!;
    if (only.kind !== "branch" && only.kind !== "match" && only.kind !== "patternBind" && only.kind !== "loop" && only.kind !== "patternLoop" && only.kind !== "for") {
      return `(do← ${emitLeanSimpleElement(only, expr, context)})`;
    }
  }
  const body = emitLeanDoMultiline(expr, payload.elements, context, 2);
  if (body.length === 0) throw new ProofScriptError("PS4966", "Internal empty do-effect-forwarding body.");
  return `(do←\n${body.join("\n")}\n)`;
}

type TypeScriptDoMonadKind = "identity" | "option-tagged" | "baseio-thunk" | "eio-thunk";

function tsMonadKind(family: string, context: import("../../core/model.js").EmitContext): TypeScriptDoMonadKind {
  const runtime = context.registry.getSemanticInfo<{ readonly kind?: string }>(`typescript.do.monad:${family}`);
  if (runtime?.kind === "identity" || runtime?.kind === "option-tagged" || runtime?.kind === "baseio-thunk" || runtime?.kind === "eio-thunk") return runtime.kind;
  throw new ProofScriptError("PS3961", `TypeScript has no do-monad runtime correspondence for semantic family '${family}'.`);
}

/** Value returned from inside an already-running do action. */
function emitTsDoResult(kind: TypeScriptDoMonadKind, value: string): string {
  if (kind === "identity" || kind === "baseio-thunk") return value;
  if (kind === "option-tagged") return `({ tag: "Some", value: ${value} } as const)`;
  return `({ tag: "Ok", value: ${value} } as const)`;
}

/** A `return e` term outside explicit do denotes a delayed monadic action. */
function emitTsPureAction(kind: TypeScriptDoMonadKind, value: string): string {
  if (kind === "identity") return value;
  if (kind === "option-tagged") return `({ tag: "Some", value: ${value} } as const)`;
  if (kind === "baseio-thunk") return `(() => ${value})`;
  return `(() => ({ tag: "Ok", value: ${value} } as const))`;
}

function emitTsDoDecisionData(
  conditionArgIndex: number,
  decision: "bool" | "eq" | "instance",
  expr: Extract<IRExpr, { kind: "extension" }>,
  context: import("../../core/model.js").EmitContext,
): string {
  const condition = expr.args[conditionArgIndex]!;
  if (decision === "bool") return context.emitExpr(condition);
  if (decision === "instance") {
    throw new ProofScriptError("PS3964", "TypeScript do-if correspondence for an arbitrary Decidable(p) instance is not implemented; only explicit runtime-decision families may branch at runtime.");
  }
  if (condition.kind === "op" && condition.op === "proof.eq") {
    const [left, right] = condition.args;
    if (!left || !right || left.type.id !== right.type.id || !(left.type.id === "Nat" || left.type.id === "Bool")) {
      throw new ProofScriptError("PS3965", "TypeScript do-if proposition correspondence currently supports Nat/Bool propositional equality only.");
    }
    return `(${context.emitExpr(left)} === ${context.emitExpr(right)})`;
  }
  throw new ProofScriptError("PS3966", "TypeScript cannot execute this ProofScript do-control proposition faithfully.");
}

function emitTsDoDecision(element: Extract<IRDoElem, { kind: "branch" }>, expr: Extract<IRExpr, { kind: "extension" }>, context: import("../../core/model.js").EmitContext): string {
  if (element.form === "unless") return context.emitExpr(expr.args[element.conditionArgIndex]!);
  return emitTsDoDecisionData(element.conditionArgIndex, element.decision, expr, context);
}

function emitTsDoPattern(
  pattern: IREquationPattern,
  temp: string,
  discriminant: IRExpr,
  context: import("../../core/model.js").EmitContext,
): { readonly condition: string; readonly bindings: readonly string[] } {
  if (pattern.kind === "wildcard") return { condition: "true", bindings: [] };
  if (pattern.kind === "variable") return { condition: "true", bindings: [`const ${pattern.name} = ${temp};`] };
  if (pattern.kind === "number") {
    if (discriminant.type.id !== "Nat") throw new ProofScriptError("PS3967", "TypeScript do-match numeric patterns require Nat.");
    return { condition: `${temp} === ${pattern.value}n`, bindings: [] };
  }
  if (pattern.kind === "named") {
    const nested = emitTsDoPattern(pattern.pattern, temp, discriminant, context);
    if (pattern.equalityName) throw new ProofScriptError("PS3968", `TypeScript cannot expose do-match equality proof '${pattern.equalityName}' computationally.`);
    return { condition: nested.condition, bindings: [`const ${pattern.name} = ${temp};`, ...nested.bindings] };
  }
  if (pattern.kind === "inaccessible") throw new ProofScriptError("PS3969", "TypeScript do-match inaccessible-pattern correspondence is not implemented.");
  if (discriminant.type.family === "core.option") {
    if (pattern.variant === "none" && pattern.fields.length === 0) return { condition: `${temp}.tag === "None"`, bindings: [] };
    if (pattern.variant === "some" && pattern.fields.length === 1) {
      const field = pattern.fields[0]!;
      if (field.kind === "wildcard") return { condition: `${temp}.tag === "Some"`, bindings: [] };
      if (field.kind === "variable") return { condition: `${temp}.tag === "Some"`, bindings: [`const ${field.name} = ${temp}.value;`] };
      throw new ProofScriptError("PS3970", "TypeScript Option do-match currently supports variable/wildcard .some payload patterns only.");
    }
  }
  throw new ProofScriptError("PS3971", `TypeScript do-match has no runtime pattern correspondence for '${renderPattern(pattern)}' on '${discriminant.type.displayName}'.`);
}

function emitTypeScriptDoElements(
  expr: Extract<IRExpr, { kind: "extension" }>,
  elements: readonly IRDoElem[],
  context: import("../../core/model.js").EmitContext,
  kind: TypeScriptDoMonadKind,
  indent: number,
  tempState: { value: number },
): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  for (const element of elements) {
    if (element.kind === "let") {
      const annotation = element.annotated ? `: ${context.emitType(element.binderType)}` : "";
      lines.push(`${pad}const ${element.name}${annotation} = ${context.emitExpr(expr.args[element.argIndex]!)};`);
      continue;
    }
    if (element.kind === "mut") {
      const annotation = element.annotated ? `: ${context.emitType(element.binderType)}` : "";
      lines.push(`${pad}let ${element.name}${annotation} = ${context.emitExpr(expr.args[element.argIndex]!)};`);
      continue;
    }
    if (element.kind === "assign") {
      lines.push(`${pad}${element.name} = ${context.emitExpr(expr.args[element.argIndex]!)};`);
      continue;
    }
    if (element.kind === "bind") {
      const actionExpr = expr.args[element.argIndex]!;
      const action = context.emitExpr(actionExpr);
      const annotation = element.annotated ? `: ${context.emitType(element.binderType)}` : "";
      if (kind === "identity") {
        lines.push(`${pad}const ${element.name}${annotation} = ${action};`);
      } else if (kind === "option-tagged") {
        const tmp = `__proofscript_do_${tempState.value++}`;
        const actionType = context.emitType(actionExpr.type);
        lines.push(`${pad}const ${tmp} = ((value: ${actionType}): ${actionType} => value)(${action});`);
        lines.push(`${pad}if (${tmp}.tag === "None") return ${tmp};`);
        lines.push(`${pad}const ${element.name}${annotation} = ${tmp}.value;`);
      } else if (kind === "baseio-thunk") {
        lines.push(`${pad}const ${element.name}${annotation} = (${action})();`);
      } else {
        const tmp = `__proofscript_do_${tempState.value++}`;
        const actionType = context.emitType(actionExpr.type);
        const resultType = `ReturnType<${actionType}>`;
        lines.push(`${pad}const ${tmp} = ((value: ${resultType}): ${resultType} => value)((${action})());`);
        lines.push(`${pad}if (${tmp}.tag === "Error") return ${tmp};`);
        lines.push(`${pad}const ${element.name}${annotation} = ${tmp}.value;`);
      }
      continue;
    }
    if (element.kind === "patternBind") {
      const actionExpr = expr.args[element.actionArgIndex]!;
      const action = context.emitExpr(actionExpr);
      const actionTmp = `__proofscript_do_${tempState.value++}`;
      let valueTmp = actionTmp;
      if (kind === "option-tagged") {
        const actionType = context.emitType(actionExpr.type);
        lines.push(`${pad}const ${actionTmp} = ((value: ${actionType}): ${actionType} => value)(${action});`);
        lines.push(`${pad}if (${actionTmp}.tag === "None") return ${actionTmp};`);
        valueTmp = `${actionTmp}.value`;
      } else if (kind === "baseio-thunk") {
        lines.push(`${pad}const ${actionTmp} = (${action})();`);
      } else if (kind === "eio-thunk") {
        const actionType = context.emitType(actionExpr.type);
        const resultType = `ReturnType<${actionType}>`;
        lines.push(`${pad}const ${actionTmp} = ((value: ${resultType}): ${resultType} => value)((${action})());`);
        lines.push(`${pad}if (${actionTmp}.tag === "Error") return ${actionTmp};`);
        valueTmp = `${actionTmp}.value`;
      } else {
        lines.push(`${pad}const ${actionTmp} = ${action};`);
      }
      const discriminant: IRExpr = { kind: "var", name: actionTmp, type: element.binderType };
      const compiled = emitTsDoPattern(element.pattern, valueTmp, discriminant, context);
      if (element.irrefutable || compiled.condition === "true") {
        for (const binding of compiled.bindings) lines.push(`${pad}${binding}`);
        lines.push(...emitTypeScriptDoElements(expr, element.continuationElements, context, kind, indent, tempState));
        continue;
      }
      lines.push(`${pad}if (${compiled.condition}) {`);
      for (const binding of compiled.bindings) lines.push(`${" ".repeat(indent + 2)}${binding}`);
      lines.push(...emitTypeScriptDoElements(expr, element.continuationElements, context, kind, indent + 2, tempState));
      lines.push(`${pad}} else {`);
      if (element.fallbackElements) {
        lines.push(...emitTypeScriptDoElements(expr, element.fallbackElements, context, kind, indent + 2, tempState));
      } else if (element.implicitFailure && kind === "option-tagged") {
        lines.push(`${" ".repeat(indent + 2)}return ({ tag: "None" } as const);`);
      } else {
        throw new ProofScriptError("PS3973", "TypeScript has no runtime failure correspondence for this refutable monadic pattern bind.");
      }
      lines.push(`${pad}}`);
      continue;
    }
    if (element.kind === "for") {
      // ForIn' membership evidence inhabits Prop and is erased after ProofScript
      // checking. Array iteration order/runtime behavior is identical here; the
      // proof binder itself has no TypeScript runtime binding.
      if (element.collectionType.family !== "core.array") {
        throw new ProofScriptError("PS39B2", `TypeScript has no verified ForIn runtime correspondence for '${element.collectionType.displayName}'.`);
      }
      const collection = context.emitExpr(expr.args[element.collectionArgIndex]!);
      if (element.pattern.kind !== "variable" && element.pattern.kind !== "wildcard") {
        throw new ProofScriptError("PS39B3", "TypeScript Array for-loop correspondence currently supports identifier/wildcard irrefutable binders only.");
      }
      const binder = element.pattern.kind === "variable" ? element.pattern.name : `__proofscript_for_${tempState.value++}`;
      lines.push(`${pad}for (const ${binder} of ${collection}) {`);
      lines.push(...emitTypeScriptDoElements(expr, element.bodyElements, context, kind, indent + 2, tempState));
      lines.push(`${pad}}`);
      if (element.finalUnit) lines.push(`${pad}return ${emitTsDoResult(kind, "undefined")};`);
      continue;
    }
    if (element.kind === "patternLoop") {
      const sourceExpr = expr.args[element.sourceArgIndex]!;
      lines.push(`${pad}while (true) {`);
      const innerPad = " ".repeat(indent + 2);
      const sourceTmp = `__proofscript_while_pattern_${tempState.value++}`;
      let valueTmp = sourceTmp;
      if (element.mode === "monadic" && kind === "option-tagged") {
        const actionType = context.emitType(sourceExpr.type);
        lines.push(`${innerPad}const ${sourceTmp} = ((value: ${actionType}): ${actionType} => value)(${context.emitExpr(sourceExpr)});`);
        lines.push(`${innerPad}if (${sourceTmp}.tag === "None") return ${sourceTmp};`);
        valueTmp = `${sourceTmp}.value`;
      } else if (element.mode === "monadic" && kind === "baseio-thunk") {
        lines.push(`${innerPad}const ${sourceTmp} = (${context.emitExpr(sourceExpr)})();`);
      } else if (element.mode === "monadic" && kind === "eio-thunk") {
        const actionType = context.emitType(sourceExpr.type);
        const resultType = `ReturnType<${actionType}>`;
        lines.push(`${innerPad}const ${sourceTmp} = ((value: ${resultType}): ${resultType} => value)((${context.emitExpr(sourceExpr)})());`);
        lines.push(`${innerPad}if (${sourceTmp}.tag === "Error") return ${sourceTmp};`);
        valueTmp = `${sourceTmp}.value`;
      } else {
        lines.push(`${innerPad}const ${sourceTmp} = ${context.emitExpr(sourceExpr)};`);
      }
      const discriminant: IRExpr = { kind: "var", name: sourceTmp, type: element.binderType };
      const compiled = emitTsDoPattern(element.pattern, valueTmp, discriminant, context);
      if (compiled.condition !== "true") lines.push(`${innerPad}if (!(${compiled.condition})) break;`);
      for (const binding of compiled.bindings) lines.push(`${innerPad}${binding}`);
      lines.push(...emitTypeScriptDoElements(expr, element.bodyElements, context, kind, indent + 2, tempState));
      lines.push(`${pad}}`);
      if (element.finalUnit) lines.push(`${pad}return ${emitTsDoResult(kind, "undefined")};`);
      continue;
    }
    if (element.kind === "loop") {
      if (element.form === "while") {
        const condition = emitTsDoDecisionData(element.conditionArgIndex!, element.decision!, expr, context);
        lines.push(`${pad}while (${condition}) {`);
        lines.push(...emitTypeScriptDoElements(expr, element.bodyElements, context, kind, indent + 2, tempState));
        lines.push(`${pad}}`);
      } else if (element.form === "repeatUntil") {
        const condition = emitTsDoDecisionData(element.conditionArgIndex!, element.decision!, expr, context);
        lines.push(`${pad}do {`);
        lines.push(...emitTypeScriptDoElements(expr, element.bodyElements, context, kind, indent + 2, tempState));
        lines.push(`${pad}} while (!(${condition}));`);
      } else {
        lines.push(`${pad}while (true) {`);
        lines.push(...emitTypeScriptDoElements(expr, element.bodyElements, context, kind, indent + 2, tempState));
        lines.push(`${pad}}`);
      }
      if (element.finalUnit) lines.push(`${pad}return ${emitTsDoResult(kind, "undefined")};`);
      continue;
    }
    if (element.kind === "break" || element.kind === "continue") {
      lines.push(`${pad}${element.kind};`);
      continue;
    }
    if (element.kind === "return") {
      const value = element.argIndex === undefined ? "undefined" : context.emitExpr(expr.args[element.argIndex]!);
      lines.push(`${pad}return ${emitTsDoResult(kind, value)};`);
      continue;
    }
    if (element.kind === "match") {
      const discriminant = expr.args[element.discriminantArgIndex]!;
      const tmp = `__proofscript_match_${tempState.value++}`;
      lines.push(`${pad}const ${tmp} = ${context.emitExpr(discriminant)};`);
      for (let index = 0; index < element.cases.length; index += 1) {
        const item = element.cases[index]!;
        if (item.patterns.length !== 1) throw new ProofScriptError("PS3972", "TypeScript do-match expects one discriminant pattern per case.");
        const compiled = emitTsDoPattern(item.patterns[0]!, tmp, discriminant, context);
        const isFinalCase = index === element.cases.length - 1;
        if (element.cases.length === 1 && compiled.condition === "true") {
          for (const binding of compiled.bindings) lines.push(`${pad}${binding}`);
          lines.push(...emitTypeScriptDoElements(expr, item.elements, context, kind, indent, tempState));
          continue;
        }
        const prefix = index === 0
          ? `if (${compiled.condition}) {`
          : isFinalCase
            ? "else {"
            : `else if (${compiled.condition}) {`;
        lines.push(`${pad}${prefix}`);
        for (const binding of compiled.bindings) lines.push(`${" ".repeat(indent + 2)}${binding}`);
        lines.push(...emitTypeScriptDoElements(expr, item.elements, context, kind, indent + 2, tempState));
        lines.push(`${pad}}`);
      }
      continue;
    }
    if (element.kind === "branch") {
      const condition = emitTsDoDecision(element, expr, context);
      const test = element.form === "unless" ? `!(${condition})` : condition;
      lines.push(`${pad}if (${test}) {`);
      lines.push(...emitTypeScriptDoElements(expr, element.thenElements, context, kind, indent + 2, tempState));
      lines.push(`${pad}}${element.elseElements !== undefined ? " else {" : ""}`);
      if (element.elseElements !== undefined) {
        lines.push(...emitTypeScriptDoElements(expr, element.elseElements, context, kind, indent + 2, tempState));
        lines.push(`${pad}}`);
      }
      if (element.finalUnitFallback) lines.push(`${pad}return ${emitTsDoResult(kind, "undefined")};`);
      continue;
    }
    const actionExpr = expr.args[element.argIndex]!;
    const action = context.emitExpr(actionExpr);
    const isLast = element === elements.at(-1);
    if (isLast) {
      if (kind === "baseio-thunk" || kind === "eio-thunk") lines.push(`${pad}return (${action})();`);
      else lines.push(`${pad}return ${action};`);
    } else if (kind === "identity") {
      lines.push(`${pad}${action};`);
    } else if (kind === "option-tagged") {
      const tmp = `__proofscript_do_${tempState.value++}`;
      const actionType = context.emitType(actionExpr.type);
      lines.push(`${pad}const ${tmp} = ((value: ${actionType}): ${actionType} => value)(${action});`);
      lines.push(`${pad}if (${tmp}.tag === "None") return ${tmp};`);
    } else if (kind === "baseio-thunk") {
      lines.push(`${pad}(${action})();`);
    } else {
      const tmp = `__proofscript_do_${tempState.value++}`;
      const actionType = context.emitType(actionExpr.type);
      const resultType = `ReturnType<${actionType}>`;
      lines.push(`${pad}const ${tmp} = ((value: ${resultType}): ${resultType} => value)((${action})());`);
      lines.push(`${pad}if (${tmp}.tag === "Error") return ${tmp};`);
    }
  }
  return lines;
}

function emitTypeScriptDo(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS3962", "Expected do IR node.");
  const payload = expr.payload as IRDoPayload;
  const kind = tsMonadKind(payload.monadFamily, context);
  const body = ["(() => {", ...emitTypeScriptDoElements(expr, payload.elements, context, kind, 2, { value: 0 }), "})"];
  if (kind === "baseio-thunk" || kind === "eio-thunk") return body.join("\n");
  body[body.length - 1] = "})()";
  return body.join("\n");
}

function emitTypeScriptTermReturn(expr: IRExpr, context: import("../../core/model.js").EmitContext): string {
  if (expr.kind !== "extension") throw new ProofScriptError("PS3963", "Expected term return IR node.");
  const payload = expr.payload as IRTermReturnPayload;
  return emitTsPureAction(tsMonadKind(payload.monadFamily, context), context.emitExpr(expr.args[0]!));
}

function emitTypeScriptDoForward(_expr: IRExpr, _context: import("../../core/model.js").EmitContext): string {
  throw new ProofScriptError(
    "PS3975",
    "TypeScript correspondence for Lean do←/do<- effect forwarding is not implemented: the current eager Id/Option runtime ABI cannot preserve wrapper-controlled invocation together with forwarded return/break/continue/mutable-state effects. Emit Lean or use an ordinary non-forwarded action where semantics permit.",
  );
}

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.do",
  version: "0.91.0",
  kind: "feature",
  semanticIds: ["lean.do.sequence", "lean.do.forward", "lean.term.return"],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  setup(registry) {
    registry.registerExpressionSyntax({ keyword: "do", owner: "lean.do.syntax", parse: parseDo });
    registry.registerExpressionSyntax({ keyword: "return", owner: "lean.term.return.syntax", parse: parseTermReturn });
    registry.registerExpressionElaborator({ owner: "lean.do.syntax", elaborate: elaborateDo });
    registry.registerExpressionElaborator({ owner: "lean.do.forward.syntax", elaborate: elaborateDoForward });
    registry.registerExpressionElaborator({ owner: "lean.term.return.syntax", elaborate: elaborateTermReturn });
    registry.registerOperation("lean.do.sequence", {
      requiredCapabilities: ["core.do"],
      verification: { level: "kernel-checkable", notes: "Lean monadic do sequence including state-passing mutable locals, same-block branch/match control, structured refutable pattern binds with fallback/failure continuations, and terminal exhaustive control; not async/await and not host statement sequencing as source semantics." },
      domain: "runtime",
    });
    registry.registerOperation("lean.term.return", {
      requiredCapabilities: ["core.do"],
      verification: { level: "kernel-checkable", notes: "Lean termReturn/pure expression outside explicit do." },
      domain: "runtime",
    });
    registry.registerOperation("lean.do.forward", {
      requiredCapabilities: ["core.do"],
      verification: { level: "kernel-checkable", notes: "Lean 4.33 do←/do<- effect forwarding. The forwarded body's normal result is owned by the continuation-taking wrapper, while return/break/continue and outer mutable-state effects target the surrounding do block. TypeScript remains fail-closed until a delayed/runtime control-stack correspondence exists." },
      domain: "runtime",
    });
    registry.registerLeanExprLowering("lean.do.sequence", emitLeanDo);
    registry.registerLeanExprLowering("lean.do.forward", emitLeanDoForward);
    registry.registerLeanExprLowering("lean.term.return", emitLeanTermReturn);
    registry.registerTargetExprLowering("typescript", "lean.do.sequence", emitTypeScriptDo);
    registry.registerTargetExprLowering("typescript", "lean.do.forward", emitTypeScriptDoForward);
    registry.registerTargetExprLowering("typescript", "lean.term.return", emitTypeScriptTermReturn);
  },
};

export default plugin;
