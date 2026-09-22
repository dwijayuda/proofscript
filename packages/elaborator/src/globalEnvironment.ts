import {
  Environment,
  Term,
  TypeclassClassMetadata,
  TypeclassInstanceMetadata,
  infer,
  instantiateTermLevels,
} from "@proofscript/kernel";
import { ElaborationError } from "@proofscript/syntax";

export interface InitialGlobalInfo { name: string; levelParams: string[]; }

export type GlobalInfo = {
  levelParams: string[];
  structureFields?: string[];
  type?: Term;
  isClass?: boolean;
  classMeta?: TypeclassClassMetadata;
  instanceMeta?: TypeclassInstanceMetadata;
};

/** Synchronize source-facing global metadata from the checked kernel environment. */
export function syncGlobals(globals: Map<string, GlobalInfo>, env: Environment): void {
  for (const entry of env.all()) {
    if (entry.declaration.kind === "quot" || entry.declaration.kind === "mutualInductive") continue;
    const previous = globals.get(entry.declaration.name);
    globals.set(entry.declaration.name, {
      levelParams: [...entry.declaration.levelParams],
      structureFields: previous?.structureFields,
      type: entry.declaration.type,
      isClass: previous?.isClass,
      classMeta: previous?.classMeta,
      instanceMeta: previous?.instanceMeta,
    });
  }
}

export function qualifyDeclarationName(name: string, namespacePath: readonly string[] | undefined): string {
  if (name.startsWith("_root_.")) return name.slice("_root_.".length);
  if (!namespacePath?.length) return name;
  return `${namespacePath.join(".")}.${name}`;
}

export function namespaceCandidates(
  name: string,
  namespacePath: readonly string[] | undefined,
  openNamespaces: readonly string[] | undefined = [],
): string[] {
  if (name.startsWith("_root_.")) return [name.slice("_root_.".length)];
  const path = namespacePath ?? [];
  const out: string[] = [];
  // Lean resolution gives current/parent non-root namespaces precedence over opens,
  // then considers opened namespaces in opening order, and finally the root name.
  for (let i = path.length; i >= 1; i--) {
    const prefix = path.slice(0, i).join(".");
    out.push(`${prefix}.${name}`);
  }
  for (const opened of openNamespaces ?? []) out.push(`${opened}.${name}`);
  out.push(name);
  return [...new Set(out)];
}

export function resolveGlobalName(
  name: string,
  namespacePath: readonly string[] | undefined,
  openNamespaces: readonly string[] | undefined,
  globals: Map<string, GlobalInfo>,
): string | undefined {
  for (const candidate of namespaceCandidates(name, namespacePath, openNamespaces)) {
    if (globals.has(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Infer an elaborated application's head type.  Checked declarations are read
 * from the kernel environment.  A pending declaration fallback exists only so a
 * structurally recursive definition can typecheck recursive calls while its
 * declaration is being elaborated; the produced Core is still checked later by
 * the kernel before it is accepted.
 */
export function inferElaborationHeadType(
  head: Term,
  ctx: Term[],
  globals: Map<string, GlobalInfo>,
  kernelEnv: Environment,
): Term {
  if (head.tag === "const" && !kernelEnv.get(head.name)) {
    const pending = globals.get(head.name);
    if (!pending?.type) throw new ElaborationError(`unknown constant during application elaboration: ${head.name}`);
    if (pending.levelParams.length !== head.levels.length) throw new ElaborationError(`universe arity mismatch for pending declaration '${head.name}'`);
    return instantiateTermLevels(pending.type, pending.levelParams, head.levels);
  }
  return infer(kernelEnv, ctx, head);
}
