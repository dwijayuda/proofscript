import {
  CoreDeclaration,
  Environment,
  Level,
  Term,
  TypeclassClassMetadata,
  TypeclassInstanceMetadata,
  checkAndAddDeclaration,
  collectTermLevelParams,
  defEq,
  infer,
  kernelWhnf,
  levelParam,
  shift,
} from "@proofscript/kernel";
import { ElaborationError, SurfaceBinder, SurfaceDeclaration, SurfaceTerm, UnsupportedFeature } from "@proofscript/syntax";
import { TypeclassEnvironment } from "@proofscript/typeclass";
import { contextFromTypes, flattenCoreApps } from "./coreUtils";
import { GlobalInfo, syncGlobals as defaultSyncGlobals } from "./globalEnvironment";
import { validateInstanceBinderDomain, validateK2rInstanceTelescope } from "./typeclassSynthesis";

type ClassDeclaration = Extract<SurfaceDeclaration, { kind: "class" }>;
type InstanceDeclaration = Extract<SurfaceDeclaration, { kind: "instance" }>;

type ElaborateTerm = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  expectedType?: Term,
) => Term;

type ElaborateTelescopeType = (
  binders: SurfaceBinder[],
  result: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
) => Term;

type ElaborateTelescopeValue = (
  binders: SurfaceBinder[],
  value: SurfaceTerm,
  expectedResult: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
) => Term;

type ElaborateConstructorType = (
  params: SurfaceBinder[],
  binders: SurfaceBinder[],
  result: SurfaceTerm | undefined,
  selfName: string,
  selfLevels: Level[],
  globalsOverride?: Map<string, GlobalInfo>,
) => Term;

export interface ClassElaborationOps {
  elaborateTerm: ElaborateTerm;
  elaborateTelescopeType: ElaborateTelescopeType;
  elaborateTelescopeValue: ElaborateTelescopeValue;
  elaborateConstructorType: ElaborateConstructorType;
  syncGlobals?: typeof defaultSyncGlobals;
}

function applyCore(fn: Term, args: Term[]): Term {
  let out = fn;
  for (const arg of args) out = { tag: "app", fn: out, arg };
  return out;
}

function closeFieldOverParams(paramTypes: Term[], params: SurfaceBinder[], fieldType: Term): Term {
  let out = fieldType;
  for (let i = params.length - 1; i >= 0; i--) {
    out = { tag: "pi", domain: paramTypes[i], body: out, binderInfo: params[i].binderInfo };
  }
  return out;
}

export function elaborateClassDeclaration(
  decl: ClassDeclaration,
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  result: CoreDeclaration[],
  typeclasses: TypeclassEnvironment,
  nextTypeclassOrder: number,
  ops: ClassElaborationOps,
): number {
  const syncGlobals = ops.syncGlobals ?? defaultSyncGlobals;
  const paramNames: string[] = [];
  const paramTypes: Term[] = [];
  for (const p of decl.params) {
    if ((p.binderInfo ?? "explicit") !== "explicit") throw new UnsupportedFeature("K3c-section-vars0 currently supports explicit class parameters only");
    const domain = ops.elaborateTerm(p.type, paramNames, paramTypes);
    const domainSort = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(paramTypes), domain));
    if (domainSort.tag !== "sort") throw new ElaborationError(`${decl.name}.${p.name}: class parameter type is not a type`);
    paramNames.push(p.name);
    paramTypes.push(domain);
  }

  const resultSort: SurfaceTerm = { tag: "sort", level: { tag: "succ", of: { tag: "zero" } } };
  const classType = ops.elaborateTelescopeType(decl.params, resultSort, [], []);
  const used = new Set<string>(collectTermLevelParams(classType));
  const levelParams = decl.availableLevels.filter(p => used.has(p));
  const selfInfo: GlobalInfo = { levelParams, type: classType };
  const withSelf = new Map(globals);
  withSelf.set(decl.name, selfInfo);

  const fields = decl.fields.map(field => ({
    name: field.name,
    type: ops.elaborateTerm(field.type, paramNames, paramTypes),
    surface: field,
  }));
  for (const field of fields) {
    const fieldSort = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(paramTypes), field.type));
    if (fieldSort.tag !== "sort") throw new ElaborationError(`${decl.name}.${field.name}: class field type is not a type`);
  }

  const fieldBinders = decl.fields.map(f => ({ name: f.name, type: f.type, binderInfo: "explicit" as const }));
  const selfLevels = levelParams.map(levelParam);
  const ctorType = ops.elaborateConstructorType(decl.params, fieldBinders, undefined, decl.name, selfLevels, withSelf);
  for (const p of collectTermLevelParams(ctorType)) used.add(p);
  const actualLevelParams = decl.availableLevels.filter(p => used.has(p));
  const ind: CoreDeclaration = {
    kind: "inductive",
    name: decl.name,
    levelParams: actualLevelParams,
    type: classType,
    numParams: decl.params.length,
    numIndices: 0,
    constructors: [{ name: `${decl.name}.mk`, type: ctorType }],
  };
  checkAndAddDeclaration(kernelEnv, ind);
  result.push(ind);
  syncGlobals(globals, kernelEnv);

  const selfAtParams = applyCore({ tag: "const", name: decl.name, levels: actualLevelParams.map(levelParam) }, paramNames.map((_, i) => ({ tag: "bvar", index: paramNames.length - 1 - i } as Term)));
  const closedFieldTypes: Term[] = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    // Generate class projections through the trusted raw projection node instead
    // of forcing every class field through the conservative simple recursor
    // synthesizer.  This preserves existing kernel checking while admitting the
    // v0.6.1 class-body case `field : A -> Nat` for explicit class parameters.
    const projected: Term = { tag: "proj", typeName: decl.name, index: i, expr: { tag: "bvar", index: 0 } };
    let projType: Term = { tag: "pi", domain: selfAtParams, body: shift(field.type, 1) };
    let projValue: Term = { tag: "lam", domain: selfAtParams, body: projected };
    for (let p = decl.params.length - 1; p >= 0; p--) {
      projType = { tag: "pi", domain: paramTypes[p], body: projType, binderInfo: decl.params[p].binderInfo };
      projValue = { tag: "lam", domain: paramTypes[p], body: projValue, binderInfo: decl.params[p].binderInfo };
    }
    const proj: CoreDeclaration = { kind: "definition", name: `${decl.name}.${field.name}`, levelParams: actualLevelParams, type: projType, value: projValue, reducibility: "regular" };
    checkAndAddDeclaration(kernelEnv, proj);
    result.push(proj);
    syncGlobals(globals, kernelEnv);
    closedFieldTypes.push(closeFieldOverParams(paramTypes, decl.params, field.type));
  }

  const meta: TypeclassClassMetadata = {
    name: decl.name,
    numParams: decl.params.length,
    params: decl.params.map(p => ({ name: p.name, binderInfo: p.binderInfo ?? "explicit" })),
    fields: fields.map((f, i) => ({ name: f.name, type: closedFieldTypes[i] })),
    declarationOrder: nextTypeclassOrder++,
  };
  typeclasses.registerClass(meta);
  const ci = globals.get(decl.name) ?? { levelParams: actualLevelParams };
  globals.set(decl.name, { ...ci, isClass: true, classMeta: meta, structureFields: fields.map(f => f.name) });
  return nextTypeclassOrder;
}

export function elaborateInstanceDeclaration(
  decl: InstanceDeclaration,
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  result: CoreDeclaration[],
  typeclasses: TypeclassEnvironment,
  nextTypeclassOrder: number,
  ops: ClassElaborationOps,
): number {
  const syncGlobals = ops.syncGlobals ?? defaultSyncGlobals;
  const binderNames: string[] = [];
  const binderTypes: Term[] = [];
  let seenInstancePrerequisite = false;
  for (const b of decl.binders) {
    const info = b.binderInfo ?? "explicit";
    const domain = ops.elaborateTerm(b.type, binderNames, binderTypes);
    if (info === "implicit" || info === "strictImplicit") {
      if (seenInstancePrerequisite) throw new UnsupportedFeature("K3c-section-vars0 requires hidden type parameters to precede instance prerequisites");
      const domainSort = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(binderTypes), domain));
      if (domainSort.tag !== "sort") throw new ElaborationError(`instance ${decl.name}.${b.name}: polymorphic instance binder type is not a type`);
    } else if (info === "instImplicit") {
      seenInstancePrerequisite = true;
      validateInstanceBinderDomain(b, domain, globals, kernelEnv, contextFromTypes(binderTypes));
    } else {
      throw new UnsupportedFeature("K3c-section-vars0 instance declarations support hidden type binders and instance-implicit prerequisites only");
    }
    binderNames.push(b.name);
    binderTypes.push(domain);
  }

  const target = ops.elaborateTerm(decl.type, binderNames, binderTypes);
  const targetSort = kernelWhnf(kernelEnv, infer(kernelEnv, contextFromTypes(binderTypes), target));
  if (targetSort.tag !== "sort") throw new ElaborationError(`instance ${decl.name}: declared target is not a type`);
  const { head, args } = flattenCoreApps(kernelWhnf(kernelEnv, target));
  const classMeta = head.tag === "const" ? typeclasses.getClass(head.name) : undefined;
  if (head.tag !== "const" || !classMeta || args.length !== classMeta.numParams) throw new ElaborationError(`instance ${decl.name}: target must be a fully applied registered class`);

  const type = ops.elaborateTelescopeType(decl.binders, decl.type, [], []);
  validateK2rInstanceTelescope(type, typeclasses, decl.name, kernelEnv);
  const value = ops.elaborateTelescopeValue(decl.binders, decl.value, decl.type, [], []);
  const actual = kernelWhnf(kernelEnv, infer(kernelEnv, [], value));
  if (!defEq(kernelEnv, [], actual, type)) throw new ElaborationError(`instance ${decl.name}: value does not have declared polymorphic class type`);
  const used = new Set<string>();
  for (const p of collectTermLevelParams(type)) used.add(p);
  for (const p of collectTermLevelParams(value)) used.add(p);
  const levelParams = decl.availableLevels.filter(p => used.has(p));
  const core: CoreDeclaration = { kind: "definition", name: decl.name, levelParams, type, value, reducibility: "regular" };
  checkAndAddDeclaration(kernelEnv, core);
  result.push(core);
  syncGlobals(globals, kernelEnv);
  const instanceMeta: TypeclassInstanceMetadata = { name: decl.name, className: head.name, priority: decl.priority, declarationOrder: nextTypeclassOrder++, scope: "global", anonymous: decl.anonymous };
  typeclasses.registerInstance(instanceMeta);
  const gi = globals.get(decl.name) ?? { levelParams };
  globals.set(decl.name, { ...gi, instanceMeta });
  return nextTypeclassOrder;
}
