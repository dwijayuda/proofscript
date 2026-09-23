import { SurfaceBinder, SurfaceDeclaration, SurfaceMatchCase, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";

/**
 * Internal names are deliberately not valid ProofScript source identifiers.
 * They can only be manufactured by the recursion compiler and consumed by the
 * elaborator while lowering a checked structural-recursion shape to a recursor.
 */
export function internalRecursionIHName(patternBinder: string): string {
  return `@@ih:${patternBinder}`;
}

function surfacePatternBinders(pattern: SurfaceMatchCase["pattern"]): readonly string[] {
  return pattern.tag === "ctor" ? pattern.binders : [];
}

/** Return true when the surface term contains a free reference to `name`. */
export function containsSurfaceName(term: SurfaceTerm, name: string, bound: ReadonlySet<string> = new Set()): boolean {
  switch (term.tag) {
    case "name": return term.name === name && !bound.has(name);
    case "sort":
    case "natLit":
    case "intLit":
    case "stringLit":
    case "boolLit":
    case "rflProof":
    case "assumptionProof": return false;
    case "bif": return containsSurfaceName(term.condition, name, bound) || containsSurfaceName(term.thenBranch, name, bound) || containsSurfaceName(term.elseBranch, name, bound);
    case "exactProof": return containsSurfaceName(term.term, name, bound);
    case "applyProof": return containsSurfaceName(term.term, name, bound) || (term.body ? containsSurfaceName(term.body, name, bound) : false);
    case "introProof": {
      const next = new Set(bound);
      for (const introduced of term.names) next.add(introduced);
      return containsSurfaceName(term.body, name, next);
    }
    case "showProof":
      return containsSurfaceName(term.type, name, bound) || containsSurfaceName(term.body, name, bound);
    case "haveProof": {
      if (term.type && containsSurfaceName(term.type, name, bound)) return true;
      if (containsSurfaceName(term.value, name, bound)) return true;
      const next = new Set(bound);
      next.add(term.name);
      return containsSurfaceName(term.body, name, next);
    }
    case "eq": return containsSurfaceName(term.left, name, bound) || containsSurfaceName(term.right, name, bound);
    case "binaryOp": return containsSurfaceName(term.left, name, bound) || containsSurfaceName(term.right, name, bound);
    case "arrayLit": case "tuple": return term.items.some(item => containsSurfaceName(item, name, bound));
    case "do": {
      const next = new Set(bound);
      for (const bind of term.binds) {
        if (containsSurfaceName(bind.value, name, next)) return true;
        next.add(bind.name);
      }
      return containsSurfaceName(term.body, name, next);
    }
    case "app": return containsSurfaceName(term.fn, name, bound) || term.args.some(a => containsSurfaceName(a, name, bound));
    case "pi": {
      if (containsSurfaceName(term.binder.type, name, bound)) return true;
      const next = new Set(bound); next.add(term.binder.name);
      return containsSurfaceName(term.body, name, next);
    }
    case "lam": {
      let next = new Set(bound);
      for (const binder of term.binders) {
        if (binder.type && containsSurfaceName(binder.type, name, next)) return true;
        next = new Set(next); next.add(binder.name);
      }
      return containsSurfaceName(term.body, name, next);
    }
    case "let": {
      if (term.type && containsSurfaceName(term.type, name, bound)) return true;
      if (containsSurfaceName(term.value, name, bound)) return true;
      const next = new Set(bound); next.add(term.name);
      return containsSurfaceName(term.body, name, next);
    }
    case "structInst": return term.fields.some(f => containsSurfaceName(f.value, name, bound));
    case "structUpdate": return containsSurfaceName(term.base,name,bound)||term.fields.some(f=>containsSurfaceName(f.value,name,bound));
    case "match": {
      if (containsSurfaceName(term.scrutinee, name, bound)) return true;
      return term.cases.some(c => {
        const next = new Set(bound);
        for (const p of surfacePatternBinders(c.pattern)) next.add(p);
        return containsSurfaceName(c.body, name, next);
      });
    }
  }
}


/**
 * K2e equation-clause compiler. Equation declarations are source syntax only.
 * This initial slice accepts one nondependent explicit function argument encoded
 * in the declaration type and lowers the clauses to the ordinary K2c match AST.
 */
export function compileEquationDefinition(
  decl: Extract<SurfaceDeclaration, { kind: "equationDefinition" }>,
): Extract<SurfaceDeclaration, { kind: "definition" }> {
  if (decl.binders.length !== 0) {
    throw new UnsupportedFeature(`K3c-section-vars0 currently requires equation def '${decl.name}' to put its single matched argument in the function type rather than declaration binders`);
  }
  if (decl.type.tag !== "pi") {
    throw new UnsupportedFeature(`K3c-section-vars0 equation def '${decl.name}' must have a one-argument function type`);
  }
  if (decl.type.body.tag === "pi") {
    throw new UnsupportedFeature(`K3c-section-vars0 equation def '${decl.name}' currently supports exactly one pattern argument`);
  }
  const sourceBinder = decl.type.binder;
  if (sourceBinder.name !== "_" && containsSurfaceName(decl.type.body, sourceBinder.name)) {
    throw new UnsupportedFeature(`K3c-section-vars0 does not yet implement dependent equation result types`);
  }
  const argName = `__eqarg_${decl.name.replace(/[^A-Za-z0-9_]/g, "_")}`;
  return {
    kind: "definition",
    name: decl.name,
    binders: [{ name: argName, type: sourceBinder.type }],
    type: decl.type.body,
    value: {
      tag: "match",
      scrutinee: { tag: "name", name: argName },
      cases: decl.equations.map(e => ({ pattern: e.pattern, body: e.body })),
    },
    availableLevels: [...decl.availableLevels],
    namespacePath: decl.namespacePath ? [...decl.namespacePath] : undefined,
  };
}

/**
 * K2d structural-recursion compiler.
 *
 * This deliberately recognizes only a tiny source pattern:
 *   - exactly one explicit function parameter;
 *   - the definition body is a top-level match on that parameter;
 *   - recursive calls are direct `f(k)` calls where `k` is a binder of the
 *     current constructor pattern.
 *
 * Valid calls are replaced by an impossible-to-author internal identifier.
 * The match elaborator binds that marker only for fields that the kernel's
 * recursor metadata identifies as recursive. Thus a call on a nonrecursive
 * field still cannot be smuggled through this source pass.
 */
export function compileStructuralRecursion(
  declarationName: string,
  binders: readonly SurfaceBinder[],
  value: SurfaceTerm,
  aliases: readonly string[] = [declarationName],
): SurfaceTerm {
  const recursiveNames=[...new Set([declarationName,...aliases])];
  if (!recursiveNames.some(name=>containsSurfaceName(value,name))) return value;

  if (binders.length !== 1) {
    throw new UnsupportedFeature(
      `K3c-section-vars0 currently supports recursive def '${declarationName}' only with exactly one explicit parameter`,
    );
  }
  if (value.tag !== "match") {
    throw new UnsupportedFeature(
      `K3c-section-vars0 requires recursive def '${declarationName}' to have a top-level match body`,
    );
  }
  if (value.scrutinee.tag !== "name" || value.scrutinee.name !== binders[0].name || value.scrutinee.levels?.length) {
    throw new UnsupportedFeature(
      `K3c-section-vars0 requires recursive def '${declarationName}' to match directly on parameter '${binders[0].name}'`,
    );
  }

  return {
    ...value,
    cases: value.cases.map(c => rewriteCase(declarationName, recursiveNames, c)),
  };
}

function rewriteCase(declarationName: string, recursiveNames: readonly string[], c: SurfaceMatchCase): SurfaceMatchCase {
  const patternNames = surfacePatternBinders(c.pattern);
  const patternBinders = new Set(patternNames);
  if (patternBinders.size !== patternNames.length) {
    throw new UnsupportedFeature(`K3c-section-vars0 does not support duplicate constructor pattern binders`);
  }
  return {
    pattern: c.pattern,
    body: rewriteBranchTerm(c.body, declarationName, recursiveNames, patternBinders, new Set()),
  };
}

function rewriteBranchTerm(
  term: SurfaceTerm,
  declarationName: string,
  recursiveNames: readonly string[],
  patternBinders: ReadonlySet<string>,
  shadowed: ReadonlySet<string>,
): SurfaceTerm {
  switch (term.tag) {
    case "sort":
    case "natLit":
    case "intLit":
    case "stringLit":
    case "boolLit":
    case "rflProof":
    case "assumptionProof": return term;
    case "bif": return { ...term, condition: rewriteBranchTerm(term.condition, declarationName, recursiveNames, patternBinders, shadowed), thenBranch: rewriteBranchTerm(term.thenBranch, declarationName, recursiveNames, patternBinders, shadowed), elseBranch: rewriteBranchTerm(term.elseBranch, declarationName, recursiveNames, patternBinders, shadowed) };
    case "exactProof": return { ...term, term: rewriteBranchTerm(term.term, declarationName, recursiveNames, patternBinders, shadowed) };
    case "applyProof": return { ...term, term: rewriteBranchTerm(term.term, declarationName, recursiveNames, patternBinders, shadowed), body: term.body ? rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, shadowed) : undefined };
    case "introProof": {
      const next = new Set(shadowed);
      for (const introduced of term.names) next.add(introduced);
      return { ...term, body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next) };
    }
    case "showProof":
      return {
        ...term,
        type: rewriteBranchTerm(term.type, declarationName, recursiveNames, patternBinders, shadowed),
        body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, shadowed),
      };
    case "haveProof": {
      const next = new Set(shadowed);
      next.add(term.name);
      return {
        ...term,
        type: term.type ? rewriteBranchTerm(term.type, declarationName, recursiveNames, patternBinders, shadowed) : undefined,
        value: rewriteBranchTerm(term.value, declarationName, recursiveNames, patternBinders, shadowed),
        body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next),
      };
    }
    case "name": {
      if (recursiveNames.includes(term.name) && !shadowed.has(term.name)) {
        throw new UnsupportedFeature(
          `K3c-section-vars0 permits recursive '${declarationName}' only as a direct call '${declarationName}(k)' on a constructor pattern binder`,
        );
      }
      return term;
    }
    case "eq": return { ...term, left: rewriteBranchTerm(term.left, declarationName, recursiveNames, patternBinders, shadowed), right: rewriteBranchTerm(term.right, declarationName, recursiveNames, patternBinders, shadowed) };
    case "binaryOp": return { ...term, left: rewriteBranchTerm(term.left, declarationName, recursiveNames, patternBinders, shadowed), right: rewriteBranchTerm(term.right, declarationName, recursiveNames, patternBinders, shadowed) };
    case "arrayLit": case "tuple": return { ...term, items: term.items.map(item => rewriteBranchTerm(item, declarationName, recursiveNames, patternBinders, shadowed)) };
    case "do": {
      let next = new Set(shadowed);
      const binds = term.binds.map(bind => {
        const value = rewriteBranchTerm(bind.value, declarationName, recursiveNames, patternBinders, next);
        next = new Set(next); next.add(bind.name);
        return { ...bind, value };
      });
      return { ...term, binds, body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next) };
    }
    case "app": {
      if (term.fn.tag === "name" && recursiveNames.includes(term.fn.name) && !shadowed.has(term.fn.name)) {
        if (term.args.length !== 1) {
          throw new UnsupportedFeature(`K3c-section-vars0 recursive call '${declarationName}' must have exactly one argument`);
        }
        const arg = term.args[0];
        if (arg.tag !== "name" || arg.levels?.length || !patternBinders.has(arg.name) || shadowed.has(arg.name)) {
          throw new UnsupportedFeature(
            `K3c-section-vars0 recursive call '${declarationName}' must target an unshadowed binder of the current constructor pattern`,
          );
        }
        return { tag: "name", name: internalRecursionIHName(arg.name) };
      }
      return {
        ...term,
        fn: rewriteBranchTerm(term.fn, declarationName, recursiveNames, patternBinders, shadowed),
        args: term.args.map(a => rewriteBranchTerm(a, declarationName, recursiveNames, patternBinders, shadowed)),
      };
    }
    case "pi": {
      const binderType = rewriteBranchTerm(term.binder.type, declarationName, recursiveNames, patternBinders, shadowed);
      const next = new Set(shadowed); next.add(term.binder.name);
      return { ...term, binder: { ...term.binder, type: binderType }, body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next) };
    }
    case "lam": {
      let next = new Set(shadowed);
      const binders = term.binders.map(b => {
        const type = b.type ? rewriteBranchTerm(b.type, declarationName, recursiveNames, patternBinders, next) : undefined;
        next = new Set(next); next.add(b.name);
        return { ...b, type };
      });
      return { ...term, binders, body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next) };
    }
    case "let": {
      const type = term.type ? rewriteBranchTerm(term.type, declarationName, recursiveNames, patternBinders, shadowed) : undefined;
      const value = rewriteBranchTerm(term.value, declarationName, recursiveNames, patternBinders, shadowed);
      const next = new Set(shadowed); next.add(term.name);
      return { ...term, type, value, body: rewriteBranchTerm(term.body, declarationName, recursiveNames, patternBinders, next) };
    }
    case "structInst": return { ...term, fields: term.fields.map(f => ({ ...f, value: rewriteBranchTerm(f.value, declarationName, recursiveNames, patternBinders, shadowed) })) };
    case "structUpdate": return { ...term, base: rewriteBranchTerm(term.base,declarationName,recursiveNames,patternBinders,shadowed), fields: term.fields.map(f=>({...f,value:rewriteBranchTerm(f.value,declarationName,recursiveNames,patternBinders,shadowed)})) };
    case "match": {
      const scrutinee = rewriteBranchTerm(term.scrutinee, declarationName, recursiveNames, patternBinders, shadowed);
      const cases = term.cases.map(inner => {
        const next = new Set(shadowed);
        for (const b of surfacePatternBinders(inner.pattern)) next.add(b);
        return {
          pattern: inner.pattern,
          body: rewriteBranchTerm(inner.body, declarationName, recursiveNames, patternBinders, next),
        };
      });
      return { ...term, scrutinee, cases };
    }
  }
}
