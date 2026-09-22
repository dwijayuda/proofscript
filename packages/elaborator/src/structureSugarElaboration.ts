import {
  Environment,
  Level,
  Term,
  defEq,
  infer,
  instantiate,
  instantiateTermLevels,
  kernelWhnf,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { contextFromTypes, containsAnyBVar, flattenCoreApps, splitCorePi, splitCorePiDomains } from "./coreUtils";
import { GlobalInfo, resolveGlobalName } from "./globalEnvironment";

export type ElaborateTerm = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

export function elaborateStructureUpdateCore(
  base: Term,
  baseType: Term,
  fields: readonly { name: string; value: SurfaceTerm }[],
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElaborateTerm,
  expectedType?: Term,
): Term {
  const ctx = contextFromTypes(localTypes);
  const normalizedBaseType = kernelWhnf(kernelEnv, baseType);
  const { head, args } = flattenCoreApps(normalizedBaseType);
  if (head.tag !== "const" || args.length !== 0) {
    throw new UnsupportedFeature("K3c-section-vars0 currently supports only parameterless structure update bases");
  }
  const info = globals.get(head.name);
  if (!info?.structureFields) {
    throw new UnsupportedFeature(`K3c-section-vars0 base type '${head.name}' is not a source structure known in this compilation unit`);
  }
  if (expectedType && !defEq(kernelEnv, ctx, normalizedBaseType, expectedType)) {
    throw new ElaborationError("structure update base does not have the expected result type");
  }

  const ctorName = `${head.name}.mk`;
  const ctorEntry = kernelEnv.get(ctorName);
  if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") {
    throw new ElaborationError(`missing generated structure constructor ${ctorName}`);
  }
  const fieldTypes = splitCorePiDomains(ctorEntry.declaration.type).slice(0, info.structureFields.length);

  const directUpdates = new Map<string, SurfaceTerm>();
  const nestedUpdates = new Map<string, { name: string; value: SurfaceTerm }[]>();
  for (const field of fields) {
    const pieces = field.name.split(".");
    if (pieces.some(p => p.length === 0)) throw new ElaborationError(`malformed structure update field path '${field.name}'`);
    const top = pieces[0];
    if (!info.structureFields.includes(top)) {
      throw new ElaborationError(`unknown structure update field '${field.name}' for ${head.name}`);
    }
    if (pieces.length === 1) {
      if (nestedUpdates.has(top)) throw new UnsupportedFeature(`PSC-1 structure update cannot mix direct field '${top}' with nested field update '${top}.*'`);
      if (directUpdates.has(top)) throw new ElaborationError(`duplicate structure update field '${top}'`);
      directUpdates.set(top, field.value);
      continue;
    }
    if (directUpdates.has(top)) throw new UnsupportedFeature(`PSC-1 structure update cannot mix direct field '${top}' with nested field update '${top}.*'`);
    const rest = pieces.slice(1).join(".");
    const bucket = nestedUpdates.get(top) ?? [];
    if (bucket.some(f => f.name === rest)) throw new ElaborationError(`duplicate nested structure update field '${field.name}'`);
    bucket.push({ name: rest, value: field.value });
    nestedUpdates.set(top, bucket);
  }

  let out: Term = { tag: "const", name: ctorName, levels: [...head.levels] };
  for (let i = 0; i < info.structureFields.length; i++) {
    const fieldName = info.structureFields[i];
    let value: Term;
    const direct = directUpdates.get(fieldName);
    if (direct) {
      value = elab(direct, locals, localTypes, globals, available, kernelEnv, fieldTypes[i]);
    } else {
      const projName = `${head.name}.${fieldName}`;
      const proj = kernelEnv.get(projName);
      if (!proj) throw new ElaborationError(`missing generated structure projection ${projName}`);
      const projected: Term = { tag: "app", fn: { tag: "const", name: projName, levels: [...head.levels] }, arg: base };
      const nested = nestedUpdates.get(fieldName);
      value = nested ? elaborateStructureUpdateCore(projected, kernelWhnf(kernelEnv, infer(kernelEnv, ctx, projected)), nested, locals, localTypes, globals, available, kernelEnv, elab, fieldTypes[i]) : projected;
    }
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, value));
    if (!defEq(kernelEnv, ctx, actual, fieldTypes[i])) throw new ElaborationError(`structure field '${fieldName}' does not have expected type during update`);
    out = { tag: "app", fn: out, arg: value };
  }
  return out;
}

function isLocalBoundName(name: string, locals: readonly string[]): boolean {
  for (let i = locals.length - 1; i >= 0; i--) if (locals[i] === name) return true;
  return false;
}

function expectedTypeHeadForConstructorShorthand(
  expectedType: Term | undefined,
  kernelEnv: Environment,
): { name: string; levels: Level[]; args: Term[] } | undefined {
  if (!expectedType) return undefined;
  const normalized = kernelWhnf(kernelEnv, expectedType);
  const { head, args } = flattenCoreApps(normalized);
  if (head.tag !== "const") return undefined;
  return { name: head.name, levels: [...head.levels], args };
}

function expectedFunctionCodomainHeadForConstructorShorthand(
  expectedType: Term | undefined,
  kernelEnv: Environment,
): { name: string; levels: Level[]; args: Term[]; domains: Term[] } | undefined {
  if (!expectedType) return undefined;
  const normalized = kernelWhnf(kernelEnv, expectedType);
  const shape = splitCorePi(normalized);
  if (shape.domains.length === 0) return undefined;
  if (shape.domains.some(containsAnyBVar) || containsAnyBVar(shape.codomain)) {
    throw new UnsupportedFeature("PSC-1 constructor shorthand partial application currently requires a nondependent expected function type");
  }
  const { head, args } = flattenCoreApps(kernelWhnf(kernelEnv, shape.codomain));
  if (head.tag !== "const") return undefined;
  return { name: head.name, levels: [...head.levels], args, domains: shape.domains };
}

export function tryElabExpectedTypeConstructorShorthand(
  nameTerm: Extract<SurfaceTerm, { tag: "name" }>,
  args: readonly SurfaceTerm[],
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElaborateTerm,
  expectedType?: Term,
): Term | undefined {
  // Constructor shorthand is intentionally expected-type-directed and fail-closed:
  // normal local/global resolution wins, qualified names already resolve normally,
  // and only parameterless/indexless inductive targets are considered here.
  if (nameTerm.levels?.length) return undefined;
  if (nameTerm.name.includes(".")) return undefined;
  if (isLocalBoundName(nameTerm.name, locals)) return undefined;
  if (resolveGlobalName(nameTerm.name, nameTerm.namespacePath, nameTerm.openNamespaces, globals)) return undefined;

  const expectedValue = expectedTypeHeadForConstructorShorthand(expectedType, kernelEnv);
  const expectedFunction = expectedValue ? undefined : expectedFunctionCodomainHeadForConstructorShorthand(expectedType, kernelEnv);
  const expected = expectedValue ?? expectedFunction;
  if (!expected) return undefined;
  const targetEntry = kernelEnv.get(expected.name);
  if (!targetEntry || targetEntry.declaration.kind !== "inductive") return undefined;
  if (targetEntry.declaration.numParams !== 0 || targetEntry.declaration.numIndices !== 0 || expected.args.length !== 0) {
    throw new UnsupportedFeature("PSC-1 constructor shorthand currently supports only parameterless/indexless expected inductive targets");
  }

  const ctorName = `${expected.name}.${nameTerm.name}`;
  const ctorEntry = kernelEnv.get(ctorName);
  if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") return undefined;
  const ctorShape = splitCorePi(ctorEntry.declaration.type);
  if (expectedValue && ctorShape.domains.length !== args.length) {
    throw new ElaborationError(`${ctorName} expects ${ctorShape.domains.length} argument(s), got ${args.length}`);
  }
  if (!expectedValue && args.length > ctorShape.domains.length) {
    throw new ElaborationError(`${ctorName} expects at most ${ctorShape.domains.length} explicit argument(s) in partial constructor shorthand, got ${args.length}`);
  }

  const ctx = contextFromTypes(localTypes);
  const expectedNormalized = kernelWhnf(kernelEnv, expectedType!);
  let out: Term = { tag: "const", name: ctorName, levels: [...expected.levels] };
  let fnType: Term = instantiateTermLevels(ctorEntry.declaration.type, ctorEntry.declaration.levelParams, expected.levels);
  for (let i = 0; i < args.length; i++) {
    const pi = kernelWhnf(kernelEnv, fnType);
    if (pi.tag !== "pi") throw new ElaborationError(`internal: ${ctorName} constructor telescope ended early`);
    if (containsAnyBVar(pi.domain)) throw new UnsupportedFeature("PSC-1 constructor shorthand partial application currently requires nondependent constructor fields");
    const argCore = elab(args[i], locals, localTypes, globals, available, kernelEnv, pi.domain);
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, argCore));
    if (!defEq(kernelEnv, ctx, actual, pi.domain)) throw new ElaborationError(`${ctorName} constructor shorthand argument ${i + 1} has wrong type`);
    out = { tag: "app", fn: out, arg: argCore };
    fnType = instantiate(pi.body, argCore);
  }
  const actualType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, out));
  if (!defEq(kernelEnv, ctx, actualType, expectedNormalized)) {
    throw new ElaborationError(`${ctorName} constructor shorthand result does not match expected type`);
  }
  return out;
}

export function tryElabDottedStructureProjection(
  term: Extract<SurfaceTerm, { tag: "name" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElaborateTerm,
): Term | undefined {
  if (term.levels?.length) return undefined;
  if (!term.name.includes(".")) return undefined;
  if (term.name.startsWith("_root_.")) return undefined;

  const lastDot = term.name.lastIndexOf(".");
  const baseName = term.name.slice(0, lastDot);
  const fieldName = term.name.slice(lastDot + 1);
  if (!baseName || !fieldName || !/^[A-Za-z_][A-Za-z0-9_']*$/.test(fieldName)) return undefined;

  let base: Term;
  try {
    base = elab({ tag: "name", name: baseName, namespacePath: term.namespacePath, openNamespaces: term.openNamespaces }, locals, localTypes, globals, available, kernelEnv);
  } catch {
    return undefined;
  }

  const ctx = contextFromTypes(localTypes);
  const baseType = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, base));
  const { head, args } = flattenCoreApps(baseType);
  if (head.tag !== "const") return undefined;
  if (args.length !== 0) {
    throw new UnsupportedFeature("PSC-1 dotted structure projection currently supports only parameterless source structures");
  }
  const info = globals.get(head.name);
  if (!info?.structureFields) return undefined;
  const fieldIndex = info.structureFields.indexOf(fieldName);
  if (fieldIndex < 0) {
    throw new ElaborationError(`unknown structure field '${fieldName}' for ${head.name}`);
  }

  const projectionName = `${head.name}.${fieldName}`;
  const projection = kernelEnv.get(projectionName);
  if (!projection) throw new ElaborationError(`missing generated structure projection ${projectionName}`);
  let out: Term = { tag: "const", name: projectionName, levels: [...head.levels] };
  out = { tag: "app", fn: out, arg: base };

  // Let the checked kernel verify the generated projection application. This
  // keeps dotted source syntax as frontend sugar over generated Core, never a
  // target-backend shortcut.
  infer(kernelEnv, ctx, out);
  return out;
}


function instantiateClosedFieldType(closed: Term, args: Term[], kernelEnv: Environment): Term | undefined {
  let cur = closed;
  for (const arg of args) {
    cur = kernelWhnf(kernelEnv, cur);
    if (cur.tag !== "pi") return undefined;
    cur = instantiate(cur.body, arg);
  }
  return cur;
}

export function elaborateStructureInstanceCore(
  term: Extract<SurfaceTerm, { tag: "structInst" }>,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  elab: ElaborateTerm,
  expectedType?: Term,
): Term {
  if (!expectedType) throw new UnsupportedFeature("K3c-section-vars0 structure/class instances require an expected type");
  const expected = kernelWhnf(kernelEnv, expectedType);
  const { head, args } = flattenCoreApps(expected);
  if (head.tag !== "const") throw new UnsupportedFeature("K3c-section-vars0 structure/class instance expected type must have a named head");
  const info = globals.get(head.name);
  if (!info?.structureFields) throw new UnsupportedFeature(`K3c-section-vars0 expected type '${head.name}' is not a source structure/class known in this compilation unit`);
  if (!info.classMeta && args.length !== 0) throw new UnsupportedFeature("K3c-section-vars0 ordinary structures remain parameterless");
  if (info.classMeta && args.length !== info.classMeta.numParams) throw new ElaborationError(`class ${head.name} expected ${info.classMeta.numParams} parameter(s), got ${args.length}`);
  const ctorName = `${head.name}.mk`;
  const ctorEntry = kernelEnv.get(ctorName);
  if (!ctorEntry || ctorEntry.declaration.kind !== "constructor") throw new ElaborationError(`missing generated structure constructor ${ctorName}`);
  const fieldTypes = info.classMeta
    ? info.classMeta.fields.map(f => {
        const t = instantiateClosedFieldType(f.type, args, kernelEnv);
        if (!t) throw new ElaborationError(`class field metadata telescope mismatch for ${head.name}.${f.name}`);
        return t;
      })
    : splitCorePiDomains(ctorEntry.declaration.type).slice(0, info.structureFields.length);
  if (fieldTypes.length !== info.structureFields.length) throw new ElaborationError(`structure constructor ${ctorName} field metadata mismatch`);
  const provided = new Map(term.fields.map(f => [f.name, f.value] as const));
  for (const name of provided.keys()) if (!info.structureFields.includes(name)) throw new ElaborationError(`unknown structure field '${name}' for ${head.name}`);
  const missing = info.structureFields.filter(name => !provided.has(name));
  if (missing.length) throw new ElaborationError(`missing structure field(s) for ${head.name}: ${missing.join(", ")}`);
  let out: Term = { tag: "const", name: ctorName, levels: [...head.levels] };
  if (info.classMeta) for (const paramArg of args) out = { tag: "app", fn: out, arg: paramArg };
  const ctx = contextFromTypes(localTypes);
  for (let i = 0; i < info.structureFields.length; i++) {
    const fieldName = info.structureFields[i];
    const fieldValue = elab(provided.get(fieldName)!, locals, localTypes, globals, available, kernelEnv, fieldTypes[i]);
    const actual = kernelWhnf(kernelEnv, infer(kernelEnv, ctx, fieldValue));
    if (!defEq(kernelEnv, ctx, actual, fieldTypes[i])) throw new ElaborationError(`structure field '${fieldName}' does not have expected type`);
    out = { tag: "app", fn: out, arg: fieldValue };
  }
  return out;
}
