import type { SurfaceExpr, SurfaceParam, SurfaceTypeExpr } from "./model.js";

function collectPatternBindingNames(pattern: unknown, result: Set<string>): void {
  if (!pattern || typeof pattern !== "object") return;
  const p = pattern as { readonly kind?: string; readonly name?: string; readonly equalityName?: string; readonly fields?: readonly unknown[]; readonly pattern?: unknown };
  if (p.kind === "variable" && p.name) result.add(p.name);
  if (p.kind === "named") {
    if (p.name) result.add(p.name);
    if (p.equalityName) result.add(p.equalityName);
    collectPatternBindingNames(p.pattern, result);
  }
  if (p.kind === "constructor") for (const field of p.fields ?? []) collectPatternBindingNames(field, result);
}

function collectPatternReferencedNames(pattern: unknown, result: Set<string>): void {
  if (!pattern || typeof pattern !== "object") return;
  const p = pattern as { readonly kind?: string; readonly term?: SurfaceExpr; readonly fields?: readonly unknown[]; readonly pattern?: unknown };
  if (p.kind === "inaccessible" && p.term) collectSurfaceExprNames(p.term, result);
  if (p.kind === "named") collectPatternReferencedNames(p.pattern, result);
  if (p.kind === "constructor") for (const field of p.fields ?? []) collectPatternReferencedNames(field, result);
}

function collectBranchNamesMinusPattern(body: SurfaceExpr, patterns: readonly unknown[], result: Set<string>, extraBound: readonly string[] = []): void {
  const branch = new Set<string>();
  collectSurfaceExprNames(body, branch);
  const bound = new Set<string>(extraBound);
  for (const pattern of patterns) {
    collectPatternBindingNames(pattern, bound);
    collectPatternReferencedNames(pattern, result);
  }
  for (const name of bound) branch.delete(name);
  for (const name of branch) result.add(name);
}

/** Collect identifier spellings referenced by a surface expression.
 *
 * This is intentionally syntax-directed and conservative.  It is used only
 * to decide which already-declared section variables must be generalized into
 * a declaration telescope; elaboration remains authoritative for type/name
 * resolution.
 */
export function collectSurfaceExprNames(expr: SurfaceExpr, result: Set<string>): void {
  switch (expr.kind) {
    case "identifier": result.add(expr.name); return;
    case "number": return;
    case "string": return;
    case "call":
      result.add(expr.callee);
      for (const arg of expr.args) collectSurfaceExprNames(arg, result);
      for (const arg of expr.namedArgs ?? []) collectSurfaceExprNames(arg.value, result);
      return;
    case "lambda":
    case "quantifier":
      for (const param of expr.params) collectSurfaceTypeNames(param.type, result);
      collectSurfaceExprNames(expr.body, result);
      return;
    case "binary":
      collectSurfaceExprNames(expr.left, result);
      collectSurfaceExprNames(expr.right, result);
      return;
    case "extension": {
      if (expr.owner === "lean.do.forward.syntax") {
        type ForwardElem = {
          readonly kind: string;
          readonly name?: string;
          readonly annotation?: SurfaceTypeExpr;
          readonly value?: SurfaceExpr;
          readonly action?: SurfaceExpr;
          readonly condition?: SurfaceExpr;
          readonly discriminant?: SurfaceExpr;
          readonly collection?: SurfaceExpr;
          readonly source?: SurfaceExpr;
          readonly fallbackElements?: readonly ForwardElem[];
          readonly thenElements?: readonly ForwardElem[];
          readonly elseElements?: readonly ForwardElem[];
          readonly alternatives?: readonly { readonly elements: readonly ForwardElem[] }[];
          readonly bodyElements?: readonly ForwardElem[];
        };
        const collectForwardElems = (elements: readonly ForwardElem[]): void => {
          for (const element of elements) {
            if (element.annotation) collectSurfaceTypeNames(element.annotation, result);
            for (const embedded of [element.value, element.action, element.condition, element.discriminant, element.collection, element.source]) {
              if (embedded) collectSurfaceExprNames(embedded, result);
            }
            if (element.fallbackElements) collectForwardElems(element.fallbackElements);
            if (element.thenElements) collectForwardElems(element.thenElements);
            if (element.elseElements) collectForwardElems(element.elseElements);
            if (element.bodyElements) collectForwardElems(element.bodyElements);
            for (const alternative of element.alternatives ?? []) collectForwardElems(alternative.elements);
          }
        };
        collectForwardElems((expr.payload as { readonly elements: readonly ForwardElem[] }).elements);
        return;
      }
      if (expr.owner === "lean.do.syntax") {
        type DoPattern = {
          readonly kind: string;
          readonly name?: string;
          readonly equalityName?: string;
          readonly fields?: readonly DoPattern[];
          readonly pattern?: DoPattern;
          readonly term?: SurfaceExpr;
        };
        type DoSurfaceElem = {
          readonly kind: string;
          readonly name?: string;
          readonly annotation?: SurfaceTypeExpr;
          readonly value?: SurfaceExpr;
          readonly action?: SurfaceExpr;
          readonly condition?: SurfaceExpr;
          readonly discriminant?: SurfaceExpr;
          readonly collection?: SurfaceExpr;
          readonly source?: SurfaceExpr;
          readonly pattern?: DoPattern;
          readonly membershipProofName?: string;
          readonly fallbackElements?: readonly DoSurfaceElem[];
          readonly thenElements?: readonly DoSurfaceElem[];
          readonly elseElements?: readonly DoSurfaceElem[];
          readonly alternatives?: readonly { readonly sequences: readonly (readonly DoPattern[])[]; readonly elements: readonly DoSurfaceElem[] }[];
          readonly bodyElements?: readonly DoSurfaceElem[];
        };
        const payload = expr.payload as { readonly elements: readonly DoSurfaceElem[] };
        const patternBoundNames = (pattern: DoPattern, names: Set<string>): void => {
          if (pattern.kind === "variable" && pattern.name) names.add(pattern.name);
          if (pattern.kind === "named") {
            if (pattern.name) names.add(pattern.name);
            if (pattern.equalityName) names.add(pattern.equalityName);
            if (pattern.pattern) patternBoundNames(pattern.pattern, names);
          }
          for (const field of pattern.fields ?? []) patternBoundNames(field, names);
        };
        const collectElements = (elements: readonly DoSurfaceElem[], inheritedBound: ReadonlySet<string>): void => {
          const bound = new Set(inheritedBound);
          for (const element of elements) {
            if (element.annotation) collectSurfaceTypeNames(element.annotation, result);
            if (element.condition) {
              const names = new Set<string>();
              collectSurfaceExprNames(element.condition, names);
              for (const name of bound) names.delete(name);
              for (const name of names) result.add(name);
            }
            if (element.discriminant) {
              const names = new Set<string>();
              collectSurfaceExprNames(element.discriminant, names);
              for (const name of bound) names.delete(name);
              for (const name of names) result.add(name);
            }
            if (element.collection) {
              const names = new Set<string>();
              collectSurfaceExprNames(element.collection, names);
              for (const name of bound) names.delete(name);
              for (const name of names) result.add(name);
            }
            if (element.thenElements) collectElements(element.thenElements, bound);
            if (element.elseElements) collectElements(element.elseElements, bound);
            if (element.fallbackElements) collectElements(element.fallbackElements, bound);
            if (element.bodyElements) {
              if ((element.kind === "for" || element.kind === "patternLoop") && element.pattern) {
                const loopBound = new Set(bound);
                patternBoundNames(element.pattern, loopBound);
                if (element.membershipProofName) loopBound.add(element.membershipProofName);
                collectElements(element.bodyElements, loopBound);
              } else {
                collectElements(element.bodyElements, bound);
              }
            }
            for (const alternative of element.alternatives ?? []) {
              for (const sequence of alternative.sequences) {
                const branchBound = new Set(bound);
                for (const pattern of sequence) patternBoundNames(pattern, branchBound);
                collectElements(alternative.elements, branchBound);
              }
            }
            const expression = element.value ?? element.action ?? element.source;
            if (expression) {
              const names = new Set<string>();
              collectSurfaceExprNames(expression, names);
              for (const name of bound) names.delete(name);
              for (const name of names) result.add(name);
            }
            if ((element.kind === "let" || element.kind === "mut" || element.kind === "bind") && element.name) bound.add(element.name);
            if (element.kind === "patternBind" && element.pattern) patternBoundNames(element.pattern, bound);
          }
        };
        collectElements(payload.elements, new Set());
        return;
      }
      if (expr.owner === "lean.term.return.syntax") {
        const payload = expr.payload as { readonly value?: SurfaceExpr };
        if (payload.value) collectSurfaceExprNames(payload.value, result);
        return;
      }
      if (expr.owner === "core.local.binding") {
        const payload = expr.payload as {
          readonly bindingKind?: string;
          readonly name?: string;
          readonly annotation?: SurfaceTypeExpr;
          readonly pattern?: unknown;
          readonly params?: readonly SurfaceParam[];
          readonly returnType?: SurfaceTypeExpr;
          readonly value: SurfaceExpr;
          readonly body: SurfaceExpr;
        };
        if (payload.bindingKind === "letRec") {
          for (const param of payload.params ?? []) collectSurfaceTypeNames(param.type, result);
          if (payload.returnType) collectSurfaceTypeNames(payload.returnType, result);
          const recursiveBody = new Set<string>();
          collectSurfaceExprNames(payload.value, recursiveBody);
          if (payload.name) recursiveBody.delete(payload.name);
          for (const param of payload.params ?? []) recursiveBody.delete(param.name);
          for (const name of recursiveBody) result.add(name);
          const continuation = new Set<string>();
          collectSurfaceExprNames(payload.body, continuation);
          if (payload.name) continuation.delete(payload.name);
          for (const name of continuation) result.add(name);
          return;
        }
        if (payload.annotation) collectSurfaceTypeNames(payload.annotation, result);
        collectSurfaceExprNames(payload.value, result);
        if (payload.pattern) collectBranchNamesMinusPattern(payload.body, [payload.pattern], result);
        else collectSurfaceExprNames(payload.body, result);
        return;
      }
      if (expr.owner === "lean.conditional.syntax") {
        const payload = expr.payload as {
          readonly form: "if" | "bif" | "if-let";
          readonly condition?: SurfaceExpr;
          readonly scrutinee?: SurfaceExpr;
          readonly pattern?: unknown;
          readonly thenBranch: SurfaceExpr;
          readonly elseBranch: SurfaceExpr;
        };
        if (payload.condition) collectSurfaceExprNames(payload.condition, result);
        if (payload.scrutinee) collectSurfaceExprNames(payload.scrutinee, result);
        if (payload.form === "if-let" && payload.pattern) collectBranchNamesMinusPattern(payload.thenBranch, [payload.pattern], result);
        else collectSurfaceExprNames(payload.thenBranch, result);
        collectSurfaceExprNames(payload.elseBranch, result);
        return;
      }
      if (expr.owner === "lean.match.syntax") {
        const payload = expr.payload as {
          readonly discriminants: readonly { readonly expression: SurfaceExpr; readonly equalityName?: string }[];
          readonly motive?: SurfaceTypeExpr;
          readonly alternatives: readonly { readonly sequences: readonly (readonly unknown[])[]; readonly body: SurfaceExpr }[];
        };
        if (payload.motive) collectSurfaceTypeNames(payload.motive, result);
        for (const discriminant of payload.discriminants) collectSurfaceExprNames(discriminant.expression, result);
        const equalityNames = payload.discriminants.flatMap((item) => item.equalityName ? [item.equalityName] : []);
        for (const alternative of payload.alternatives) {
          for (const sequence of alternative.sequences) collectBranchNamesMinusPattern(alternative.body, sequence, result, equalityNames);
        }
        return;
      }
      // Other extension payloads are plugin-owned. A plugin whose extension embeds
      // section-variable-bearing syntax must report those names explicitly.
      return;
    }
  }
}

export function collectSurfaceTypeNames(type: SurfaceTypeExpr, result: Set<string>): void {
  switch (type.kind) {
    case "term": collectSurfaceExprNames(type.expr, result); return;
    case "sort": return;
    case "arrow":
      collectSurfaceTypeNames(type.domain, result);
      collectSurfaceTypeNames(type.codomain, result);
      return;
    case "pi":
      for (const param of type.params) collectSurfaceTypeNames(param.type, result);
      collectSurfaceTypeNames(type.codomain, result);
      return;
  }
}

export function collectSurfaceParamTypeNames(params: readonly SurfaceParam[], result: Set<string>): void {
  for (const param of params) collectSurfaceTypeNames(param.type, result);
}

export function explicitBinderNames(params: readonly SurfaceParam[]): Set<string> {
  return new Set(params.map((param) => param.name));
}
