import { type SurfaceBinder, type SurfaceDeclaration, type SurfaceTerm } from "@proofscript/syntax";
import { type GlobalInfo, resolveGlobalName } from "./globalEnvironment";

export interface ResolvedGlobalReference {
  readonly rawName: string;
  readonly resolvedName: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

/**
 * Collect direct global-name references from already parsed canonical surface terms.
 *
 * This is editor metadata only. It does not participate in elaboration or kernel
 * acceptance. A reference is emitted only when:
 * - the parser retained an exact source span for the name term;
 * - the name is not shadowed by a lexical local;
 * - the same namespace/open-namespace resolver used by elaboration resolves it
 *   to a known checked global.
 *
 * Dotted projections and expected-type constructor shorthand are deliberately
 * absent until their source identity can be represented without guessing.
 */
export function collectResolvedGlobalReferences(
  declarations: readonly SurfaceDeclaration[],
  knownGlobalNames: readonly string[],
): readonly ResolvedGlobalReference[] {
  const globals = new Map<string, GlobalInfo>();
  for (const name of knownGlobalNames) globals.set(name, { levelParams: [] });

  const out: ResolvedGlobalReference[] = [];
  for (const declaration of declarations) collectDeclaration(declaration, globals, out);
  return out;
}

function collectDeclaration(
  declaration: SurfaceDeclaration,
  globals: Map<string, GlobalInfo>,
  out: ResolvedGlobalReference[],
): void {
  switch (declaration.kind) {
    case "theorem":
    case "definition":
    case "abbrev":
    case "opaque":
    case "example":
    case "axiom": {
      const locals = collectBinders(declaration.binders, new Set(), globals, out);
      collectTerm(declaration.type, locals, globals, out);
      if (declaration.kind !== "axiom") collectTerm(declaration.value, locals, globals, out);
      return;
    }
    case "equationDefinition": {
      const locals = collectBinders(declaration.binders, new Set(), globals, out);
      collectTerm(declaration.type, locals, globals, out);
      for (const equation of declaration.equations) {
        const scoped = new Set(locals);
        if (equation.pattern.tag === "ctor") {
          for (const name of equation.pattern.binders) scoped.add(name);
        }
        collectTerm(equation.body, scoped, globals, out);
      }
      return;
    }
    case "inductive": {
      const params = collectBinders(declaration.params, new Set(), globals, out);
      collectTerm(declaration.type, params, globals, out);
      for (const ctor of declaration.constructors) {
        const scoped = collectBinders(ctor.binders, new Set(params), globals, out);
        if (ctor.result) collectTerm(ctor.result, scoped, globals, out);
      }
      return;
    }
    case "structure": {
      let locals = new Set<string>();
      for (const field of declaration.fields) {
        collectTerm(field.type, locals, globals, out);
        locals = new Set(locals);
        locals.add(field.name);
      }
      return;
    }
    case "class": {
      let locals = collectBinders(declaration.params, new Set(), globals, out);
      for (const field of declaration.fields) {
        collectTerm(field.type, locals, globals, out);
        locals = new Set(locals);
        locals.add(field.name);
      }
      return;
    }
    case "instance": {
      const locals = collectBinders(declaration.binders, new Set(), globals, out);
      collectTerm(declaration.type, locals, globals, out);
      collectTerm(declaration.value, locals, globals, out);
      return;
    }
  }
}

function collectBinders(
  binders: readonly SurfaceBinder[],
  initialLocals: ReadonlySet<string>,
  globals: Map<string, GlobalInfo>,
  out: ResolvedGlobalReference[],
): Set<string> {
  let locals = new Set(initialLocals);
  for (const binder of binders) {
    collectTerm(binder.type, locals, globals, out);
    locals = new Set(locals);
    locals.add(binder.name);
  }
  return locals;
}

function collectTerm(
  term: SurfaceTerm,
  locals: ReadonlySet<string>,
  globals: Map<string, GlobalInfo>,
  out: ResolvedGlobalReference[],
): void {
  switch (term.tag) {
    case "name": {
      if (locals.has(term.name)) return;
      const resolvedName = resolveGlobalName(term.name, term.namespacePath, term.openNamespaces, globals);
      if (
        resolvedName
        && Number.isInteger(term.sourceStartOffset)
        && Number.isInteger(term.sourceEndOffset)
        && term.sourceStartOffset! >= 0
        && term.sourceEndOffset! >= term.sourceStartOffset!
      ) {
        out.push({
          rawName: term.name,
          resolvedName,
          startOffset: term.sourceStartOffset!,
          endOffset: term.sourceEndOffset!,
        });
      }
      return;
    }
    case "sort":
    case "natLit":
    case "intLit":
    case "stringLit":
    case "boolLit":
    case "rflProof":
    case "assumptionProof":
      return;
    case "arrayLit":
    case "tuple":
      for (const item of term.items) collectTerm(item, locals, globals, out);
      return;
    case "do": {
      let scoped = new Set(locals);
      for (const bind of term.binds) {
        collectTerm(bind.value, scoped, globals, out);
        scoped = new Set(scoped);
        scoped.add(bind.name);
      }
      collectTerm(term.body, scoped, globals, out);
      return;
    }
    case "bif":
      collectTerm(term.condition, locals, globals, out);
      collectTerm(term.thenBranch, locals, globals, out);
      collectTerm(term.elseBranch, locals, globals, out);
      return;
    case "exactProof":
      collectTerm(term.term, locals, globals, out);
      return;
    case "applyProof":
      collectTerm(term.term, locals, globals, out);
      if (term.body) collectTerm(term.body, locals, globals, out);
      return;
    case "introProof": {
      const scoped = new Set(locals);
      for (const name of term.names) scoped.add(name);
      collectTerm(term.body, scoped, globals, out);
      return;
    }
    case "eq":
    case "binaryOp":
      collectTerm(term.left, locals, globals, out);
      collectTerm(term.right, locals, globals, out);
      return;
    case "app":
      collectTerm(term.fn, locals, globals, out);
      for (const arg of term.args) collectTerm(arg, locals, globals, out);
      return;
    case "lam": {
      let scoped = new Set(locals);
      for (const binder of term.binders) {
        if (binder.type) collectTerm(binder.type, scoped, globals, out);
        scoped = new Set(scoped);
        scoped.add(binder.name);
      }
      collectTerm(term.body, scoped, globals, out);
      return;
    }
    case "pi":
      collectTerm(term.binder.type, locals, globals, out);
      collectTerm(term.body, new Set([...locals, term.binder.name]), globals, out);
      return;
    case "let":
      if (term.type) collectTerm(term.type, locals, globals, out);
      collectTerm(term.value, locals, globals, out);
      collectTerm(term.body, new Set([...locals, term.name]), globals, out);
      return;
    case "match":
      collectTerm(term.scrutinee, locals, globals, out);
      for (const matchCase of term.cases) {
        const scoped = new Set(locals);
        if (matchCase.pattern.tag === "ctor") {
          for (const name of matchCase.pattern.binders) scoped.add(name);
        }
        collectTerm(matchCase.body, scoped, globals, out);
      }
      return;
    case "structInst":
      for (const field of term.fields) collectTerm(field.value, locals, globals, out);
      return;
    case "structUpdate":
      collectTerm(term.base, locals, globals, out);
      for (const field of term.fields) collectTerm(field.value, locals, globals, out);
      return;
  }
}
