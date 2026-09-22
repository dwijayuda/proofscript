import type { CoreArtifact, CoreDeclaration } from "@proofscript/kernel";
import type { ConstructorEmitInfo, ProjectionEmitInfo, RecursorEmitInfo } from "./types";
import { containsConstName, flattenPi, termHeadConstName } from "./termEmitter";

export function collectConstructors(decls: readonly CoreDeclaration[]): Map<string, ConstructorEmitInfo> {
  const out = new Map<string, ConstructorEmitInfo>();
  for (const decl of decls) {
    if (decl.kind !== "inductive") continue;
    if (decl.numIndices !== 0) continue;
    decl.constructors.forEach((ctor, ctorIndex) => {
      const totalDomains = flattenPi(ctor.type).domains.length;
      if (totalDomains < decl.numParams) return;
      out.set(ctor.name, { owner: decl.name, ctorIndex, paramArity: decl.numParams, arity: totalDomains - decl.numParams });
    });
  }
  return out;
}

export function collectSimpleRecursors(decls: readonly CoreDeclaration[]): Map<string, RecursorEmitInfo> {
  const out = new Map<string, RecursorEmitInfo>();
  for (const decl of decls) {
    if (decl.kind !== "inductive") continue;
    if (decl.numIndices !== 0) continue;
    const arities: number[] = [];
    const recursiveFieldPositions: number[][] = [];
    let unsupportedNestedRecursiveField = false;
    for (const ctor of decl.constructors) {
      const domains = flattenPi(ctor.type).domains.slice(decl.numParams);
      const positions: number[] = [];
      domains.forEach((domain, index) => {
        // Recursive fields of parameterized inductives appear as applications
        // such as `List Nat`, not as a bare `List` constant. Treat a field as
        // direct recursion when its head constant is the inductive family; only
        // deeper occurrences remain unsupported in the PSC-1 runtime recursor.
        if (termHeadConstName(domain) === decl.name) positions.push(index);
        else if (containsConstName(domain, decl.name)) unsupportedNestedRecursiveField = true;
      });
      if (unsupportedNestedRecursiveField) break;
      arities.push(domains.length + positions.length);
      recursiveFieldPositions.push(positions);
    }
    if (unsupportedNestedRecursiveField) continue;
    out.set(`${decl.name}.rec`, { owner: decl.name, paramArity: decl.numParams, arities, recursiveFieldPositions });
  }
  return out;
}

export function collectSimpleProjections(decls: readonly CoreDeclaration[]): Map<string, ProjectionEmitInfo> {
  const inductives = new Map<string, Extract<CoreDeclaration, { kind: "inductive" }>>();
  for (const decl of decls) {
    if (decl.kind === "inductive" && decl.numIndices === 0 && decl.constructors.length === 1) inductives.set(decl.name, decl);
  }
  const nextIndex = new Map<string, number>();
  const out = new Map<string, ProjectionEmitInfo>();
  for (const decl of decls) {
    if (decl.kind !== "definition" || !decl.name.includes(".")) continue;
    const owner = decl.name.slice(0, decl.name.lastIndexOf("."));
    const inductive = inductives.get(owner);
    if (!inductive) continue;
    const typeShape = flattenPi(decl.type);
    if (typeShape.domains.length < inductive.numParams + 1) continue;
    const selfDomain = typeShape.domains[inductive.numParams];
    if (termHeadConstName(selfDomain) !== owner) continue;
    const fieldIndex = nextIndex.get(owner) ?? 0;
    nextIndex.set(owner, fieldIndex + 1);
    out.set(decl.name, { owner, paramArity: inductive.numParams, fieldIndex });
  }
  return out;
}

export function userDeclarations(artifact: CoreArtifact, userDeclarationOffset = 0): CoreDeclaration[] {
  if (!Number.isSafeInteger(userDeclarationOffset) || userDeclarationOffset < 0) {
    throw new Error(`invalid userDeclarationOffset ${userDeclarationOffset}`);
  }
  return artifact.declarations.slice(userDeclarationOffset);
}

export function isNonExecutableDeclaration(decl: CoreDeclaration): boolean {
  return decl.kind === "axiom" || decl.kind === "theorem" || decl.kind === "example" || decl.kind === "inductive" || decl.kind === "mutualInductive" || decl.kind === "quot";
}
