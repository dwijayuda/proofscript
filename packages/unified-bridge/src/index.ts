import crypto from "node:crypto";
import {
  Registry,
  checkSource as checkNextSource,
  checkProject as checkNextProject,
  compileProgram,
  leanProver,
  defFeature,
  typeFeature,
  natFeature,
  natArithmeticFeature,
  propEqFeature,
  theoremFeature,
  boolFeature,
  beqFeature,
  declarationsFeature,
  environmentFeature,
  conditionalsFeature,
  localBindingFeature,
  typeclassFeature,
  structureFeature,
  orderFeature,
  typescriptBackend,
  typescriptBoolBeqBackendFeature,
  typescriptConditionalsBackendFeature,
  typescriptOrderBackendFeature,
  typescriptStructureClassBackendFeature,
  adtFeature,
  matchFeature,
  typescriptAdtBackendFeature,
  optionFeature,
  typescriptOptionBackendFeature,
  listFeature,
  typescriptListBackendFeature,
  exceptFeature,
  typescriptExceptBackendFeature,
  intFeature,
  typescriptIntBackendFeature,
  stringFeature,
  typescriptStringBackendFeature,
  type BinderInfo as NextBinderInfo,
  type IRDeclaration,
  type IRDef,
  type IRExtensionDecl,
  type IRExpr,
  type IRParam,
  type IRProgram,
  type IRType,
  type CheckedProjectModule,
  moduleInterfaceHash,
} from "@proofscript/frontend-next";
import {
  checkCoreDeclarations,
  type BinderInfo,
  type CheckSummary,
  type CoreArtifact,
  type CoreDeclaration,
  type Term,
  levelOfNat,
} from "@proofscript/kernel";
import { makeKernelLevelInstantiationConformanceArtifact } from "@proofscript/kernel-codec";
import { loadStandardBootstrap } from "@proofscript/environment";
import { CoreLoweringRegistry, type CoreLoweringDescriptor } from "./lowering-registry.js";
import {
  coreWaveBDecidableDeclarations,
  waveBReservedCoreNames,
  WAVEB_DECIDABLE,
  WAVEB_NAT_DEC_EQ,
  WAVEB_NAT_DEC_LE,
  WAVEB_NAT_DEC_LT,
} from "./wave-b-decidable.js";
export {
  coreWaveBDecidableDeclarations,
  WAVEB_DECIDABLE,
  WAVEB_NAT_DEC_EQ,
  WAVEB_NAT_DEC_LE,
  WAVEB_NAT_DEC_LT,
} from "./wave-b-decidable.js";
export { CoreLoweringRegistry, type CoreLoweringDescriptor } from "./lowering-registry.js";
import { coreWaveFHAddDeclarations, WAVEF_HADD, WAVEF_HADD_FIELD } from "./wave-f-hadd.js";
export { coreWaveFHAddDeclarations, WAVEF_HADD, WAVEF_HADD_FIELD } from "./wave-f-hadd.js";
import { coreWaveGAddDeclarations, coreWaveGNatAddDictionary, coreWaveGHAddFromAdd, WAVEG_ADD, WAVEG_ADD_FIELD, WAVEG_ADD_MK } from "./wave-g-add.js";
export { coreWaveGAddDeclarations, WAVEG_ADD, WAVEG_ADD_FIELD, WAVEG_ADD_MK } from "./wave-g-add.js";

export const UNIFIED_INTEGRATION_PROFILE = "PRODUCTION-P6-bounded-string" as const;
export const UI2_INTERNAL_NAT_MUL = "ProofScript.Internal.UI2.Nat.mul" as const;
export const UI3_INTERNAL_NAT_PRED = "ProofScript.Internal.UI3.Nat.pred" as const;
export const UI3_INTERNAL_NAT_SUB = "ProofScript.Internal.UI3.Nat.sub" as const;
export const UI4_NAT_LE = "Nat.le" as const;
export const UI4_NAT_LT = "Nat.lt" as const;
export const WAVEA_NAT_BEQ = "ProofScript.Core.WaveA.Nat.beq" as const;
export const WAVEA_NAT_BLE = "ProofScript.Core.WaveA.Nat.ble" as const;
export const WAVEA_NAT_BLT = "ProofScript.Core.WaveA.Nat.blt" as const;
export const CORE_PROFILE = "KERNEL-level-instantiation-conformance1" as const;
export const CORE_FORMAT = 71 as const;

export class UnifiedBridgeUnsupported extends Error {
  constructor(message: string) { super(message); this.name = "UnifiedBridgeUnsupported"; }
}

export interface UnifiedCheckedProgram {
  readonly integrationProfile: typeof UNIFIED_INTEGRATION_PROFILE;
  readonly source: string;
  readonly sourceSha256: string;
  readonly semanticIR: IRProgram;
  readonly semanticIrSha256: string;
  readonly coreArtifact: CoreArtifact;
  readonly coreSha256: string;
  readonly kernelSummary: CheckSummary;
  readonly typescript: string;
}

export interface UnifiedProjectModuleFingerprint {
  readonly module: string;
  readonly sourceSha256: string;
  readonly semanticIrSha256: string;
  readonly publicInterfaceSha256: string;
  readonly privateInterfaceSha256: string;
  readonly imports: readonly { readonly module: string; readonly public: boolean; readonly meta?: boolean; readonly all?: boolean }[];
}

export interface UnifiedCheckedProject {
  readonly integrationProfile: typeof UNIFIED_INTEGRATION_PROFILE;
  readonly projectDir: string;
  readonly entry: string;
  readonly modules: readonly string[];
  readonly moduleInterfaces: readonly UnifiedProjectModuleFingerprint[];
  readonly projectInterfaceSha256: string;
  readonly projectSourceSha256: string;
  readonly semanticIR: IRProgram;
  readonly semanticIrSha256: string;
  readonly coreArtifact: CoreArtifact;
  readonly coreSha256: string;
  readonly kernelSummary: CheckSummary;
  readonly typescript: string;
}

export function createUnifiedRegistry(): Registry {
  const registry = new Registry();
  for (const plugin of [
    leanProver, defFeature, typeFeature, natFeature, natArithmeticFeature, propEqFeature, theoremFeature,
    boolFeature, beqFeature, declarationsFeature, environmentFeature, typeclassFeature, structureFeature, adtFeature, matchFeature, conditionalsFeature, localBindingFeature, orderFeature, typescriptBackend,
    typescriptBoolBeqBackendFeature, typescriptConditionalsBackendFeature, typescriptOrderBackendFeature, typescriptStructureClassBackendFeature, typescriptAdtBackendFeature, optionFeature, typescriptOptionBackendFeature, listFeature, typescriptListBackendFeature, exceptFeature, typescriptExceptBackendFeature, intFeature, typescriptIntBackendFeature, stringFeature, typescriptStringBackendFeature,
  ]) registry.install(plugin);
  return registry;
}

/**
 * First migration slice for the unified architecture.
 *
 * The v0.91 frontend remains untrusted. Its Semantic IR is translated into the
 * v71 trusted-boundary K3-TB Core language and accepted only when the standalone kernel checks
 * the resulting declarations. Unsupported IR fails closed.
 */
function mergeStandardBootstrapWithOwnedDeclarations(
  standardDeclarations: readonly CoreDeclaration[],
  ownedDeclarations: readonly CoreDeclaration[],
): CoreDeclaration[] {
  const ownedByName = new Map(ownedDeclarations.map((declaration) => [declaration.name, declaration]));
  const inserted = new Set<string>();
  const merged: CoreDeclaration[] = [];
  for (const declaration of standardDeclarations) {
    const replacement = ownedByName.get(declaration.name);
    if (replacement?.kind === "inductive" && declaration.kind === "inductive") {
      merged.push(replacement);
      inserted.add(replacement.name);
    } else {
      merged.push(declaration);
    }
  }
  for (const declaration of ownedDeclarations) {
    if (!inserted.has(declaration.name)) merged.push(declaration);
  }
  return merged;
}

export function checkUnifiedSource(source: string, registry = createUnifiedRegistry()): UnifiedCheckedProgram {
  const semanticIR = checkNextSource(source, registry).program;
  const standard = loadStandardBootstrap().artifact;
  const ownedDeclarations = lowerProgramToCore(semanticIR);
  const declarations = mergeStandardBootstrapWithOwnedDeclarations(standard.declarations, ownedDeclarations);
  const coreArtifact = makeKernelLevelInstantiationConformanceArtifact(declarations, standard.typeclasses);
  let kernelSummary: CheckSummary;
  try {
    kernelSummary = checkCoreDeclarations(coreArtifact.declarations, CORE_PROFILE);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`standalone kernel rejected unified Core: ${message}`, { cause: error });
  }
  if (kernelSummary.status !== "accepted") throw new Error(`standalone kernel rejected unified Core: ${kernelSummary.message ?? kernelSummary.status}`);
  const typescript = compileProgram(runtimeProgramForUnified(semanticIR), registry, "typescript").targetSource;
  return {
    integrationProfile: UNIFIED_INTEGRATION_PROFILE,
    source,
    sourceSha256: sha256(source),
    semanticIR,
    semanticIrSha256: sha256(stableJson(semanticIR)),
    coreArtifact,
    coreSha256: sha256(stableJson(coreArtifact)),
    kernelSummary,
    typescript,
  };
}

export async function checkUnifiedProject(projectDir: string, entryRelativePath: string, registry = createUnifiedRegistry()): Promise<UnifiedCheckedProject> {
  const project = await checkNextProject(projectDir, entryRelativePath, registry);
  const semanticIR: IRProgram = { declarations: project.modules.flatMap((module) => module.program.declarations) };
  const standard = loadStandardBootstrap().artifact;
  const ownedDeclarations = lowerProjectModulesToCore(project.modules);
  const declarations = mergeStandardBootstrapWithOwnedDeclarations(standard.declarations, ownedDeclarations);
  const coreArtifact = makeKernelLevelInstantiationConformanceArtifact(declarations, standard.typeclasses);
  let kernelSummary: CheckSummary;
  try {
    kernelSummary = checkCoreDeclarations(coreArtifact.declarations, CORE_PROFILE);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`standalone kernel rejected unified project Core: ${message}`, { cause: error });
  }
  if (kernelSummary.status !== "accepted") throw new Error(`standalone kernel rejected unified project Core: ${kernelSummary.message ?? kernelSummary.status}`);
  const runtimeProgram: IRProgram = runtimeProgramForUnified({ declarations: project.modules.flatMap((module) => filterProjectRuntimeProgram(module.program).declarations) });
  const typescript = compileProgram(runtimeProgram, project.entry.registry, "typescript").targetSource;
  const moduleInterfaces = project.modules.map((module) => ({
    module: module.module,
    sourceSha256: sha256(module.source),
    semanticIrSha256: sha256(stableJson(module.program)),
    publicInterfaceSha256: moduleInterfaceHash(module.interface, module.registry),
    privateInterfaceSha256: moduleInterfaceHash(module.privateInterface, module.registry),
    imports: module.imports,
  }));
  const sources = project.modules.map((module) => ({ module: module.module, source: module.source, imports: module.imports }));
  return {
    integrationProfile: UNIFIED_INTEGRATION_PROFILE,
    projectDir,
    entry: project.entry.module,
    modules: project.modules.map((module) => module.module),
    moduleInterfaces,
    projectInterfaceSha256: sha256(stableJson(moduleInterfaces)),
    projectSourceSha256: sha256(stableJson(sources)),
    semanticIR,
    semanticIrSha256: sha256(stableJson(semanticIR)),
    coreArtifact,
    coreSha256: sha256(stableJson(coreArtifact)),
    kernelSummary,
    typescript,
  };
}

function filterProjectRuntimeProgram(program: IRProgram): IRProgram {
  return {
    declarations: program.declarations
      .filter((declaration) => !(declaration.kind === "extension" && (declaration.op === "lean.module.header" || declaration.op === "lean.import")))
      .map(stripProjectRuntimeAccessModifiers),
  };
}

function stripProjectRuntimeAccessModifiers(declaration: IRDeclaration): IRDeclaration {
  if (!("modifiers" in declaration) || !declaration.modifiers) return declaration;
  const modifiers = declaration.modifiers as Record<string, unknown>;
  const runtimeRelevant = Object.keys(modifiers).filter((key) => !["visibility", "protected", "expose"].includes(key));
  if (runtimeRelevant.length > 0) return declaration;
  const stripped = { ...declaration } as Record<string, unknown>;
  delete stripped.modifiers;
  return stripped as unknown as IRDeclaration;
}

const PRODUCTION_ENVIRONMENT_DECLARATIONS = new Set([
  "lean.module.header", "lean.import",
  "lean.namespace.enter", "lean.namespace.exit", "lean.open.namespace", "lean.open.namespace.in", "lean.open.in.exit", "lean.export",
]);

function isProductionEnvironmentDeclaration(declaration: IRDeclaration): boolean {
  return declaration.kind === "extension" && PRODUCTION_ENVIRONMENT_DECLARATIONS.has(declaration.op);
}

function tsIdentifierForCoreName(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, "__").replace(/^(?=\d)/, "__");
}

function mapRuntimeExprNames(expr: IRExpr, nameMap: ReadonlyMap<string,string>): IRExpr {
  switch (expr.kind) {
    case "var": return nameMap.has(expr.name) ? { ...expr, name: nameMap.get(expr.name)! } : expr;
    case "call": {
      const mapped = { ...expr, callee: nameMap.get(expr.callee) ?? expr.callee, args: expr.args.map(arg => mapRuntimeExprNames(arg, nameMap)) } as Record<string, unknown>;
      if (expr.checkedArgs) mapped.checkedArgs = expr.checkedArgs.map(arg => mapRuntimeExprNames(arg, nameMap));
      return mapped as IRExpr;
    }
    case "apply": return { ...expr, callee: mapRuntimeExprNames(expr.callee, nameMap), args: expr.args.map(arg => mapRuntimeExprNames(arg, nameMap)) };
    case "lambda": return { ...expr, body: mapRuntimeExprNames(expr.body, nameMap) };
    case "quantifier": return { ...expr, body: mapRuntimeExprNames(expr.body, nameMap) };
    case "op": return { ...expr, args: expr.args.map(arg => mapRuntimeExprNames(arg, nameMap)) };
    case "extension": return { ...expr, args: expr.args.map(arg => mapRuntimeExprNames(arg, nameMap)) };
    case "literal":
    case "type":
      return expr;
  }
}

function runtimeProgramForUnified(program: IRProgram): IRProgram {
  const runtimeDeclarations = program.declarations.filter((declaration) => !isProductionEnvironmentDeclaration(declaration));
  const nameMap = new Map<string,string>();
  for (const declaration of runtimeDeclarations) {
    if (declaration.kind === "def") {
      const semantic = declaration.semanticName ?? declaration.name;
      if (/[^A-Za-z0-9_$]/.test(semantic) || /^\d/.test(semantic)) nameMap.set(semantic, tsIdentifierForCoreName(semantic));
      if (declaration.name !== semantic && (/[^A-Za-z0-9_$]/.test(declaration.name) || /^\d/.test(declaration.name))) nameMap.set(declaration.name, tsIdentifierForCoreName(declaration.name));
    }
  }
  return {
    declarations: runtimeDeclarations.map((declaration) => {
      const stripped = stripProjectRuntimeAccessModifiers(declaration);
      if (stripped.kind !== "def") return stripped;
      const semantic = stripped.semanticName ?? stripped.name;
      const runtimeName = nameMap.get(semantic) ?? nameMap.get(stripped.name) ?? stripped.name;
      const runtimeDef = { ...stripped, name: runtimeName, body: mapRuntimeExprNames(stripped.body, nameMap) } as Record<string, unknown>;
      delete runtimeDef.semanticName;
      return runtimeDef as unknown as IRDef;
    }),
  };
}

export function lowerProgramToCore(program: IRProgram): CoreDeclaration[] {
  const globals = new Set<string>();
  const context = makeLoweringContext();
  const out = lowerDeclarationsToCore(program.declarations, globals, context);
  return [...libraryDeclarationsForContext(context), ...out];
}

function lowerProjectModulesToCore(modules: readonly CheckedProjectModule[]): CoreDeclaration[] {
  const globals = new Set<string>();
  const context = makeLoweringContext();
  const out: CoreDeclaration[] = [];
  for (const module of modules) out.push(...lowerDeclarationsToCore(module.program.declarations, globals, context));
  return [...libraryDeclarationsForContext(context), ...out];
}

function lowerDeclarationsToCore(declarations: readonly IRDeclaration[], globals: Set<string>, context: LoweringContext): CoreDeclaration[] {
  const out: CoreDeclaration[] = [];
  const reservedNames = new Set([UI2_INTERNAL_NAT_MUL, UI3_INTERNAL_NAT_PRED, UI3_INTERNAL_NAT_SUB, UI4_NAT_LE, UI4_NAT_LT, WAVEA_NAT_BEQ, WAVEA_NAT_BLE, WAVEA_NAT_BLT, "Nat.le.refl", "Nat.le.step", "Int", "Int.ofNat", "Int.negSucc", "ProofScript.Core.P3.Int.neg", "ProofScript.Core.P3.Int.toNat", "ProofScript.Core.P3.Int.natAbs", "ProofScript.Core.P6.String", WAVEG_ADD, WAVEG_ADD_FIELD, WAVEG_ADD_MK, WAVEF_HADD, WAVEF_HADD_FIELD, "HAdd.mk", ...waveBReservedCoreNames()]);
  for (const declaration of declarations) {
    const name = declaration.kind === "def"
      ? (declaration.semanticName ?? declaration.name)
      : declaration.kind === "extension"
        ? (declaration.payload as { name?: string } | undefined)?.name
        : undefined;
    if (name && reservedNames.has(name)) throw new UnifiedBridgeUnsupported(`Production source may not declare reserved integration name '${name}'`);
  }
  for (const declaration of declarations) {
    let produced: CoreDeclaration[];
    if (isProductionEnvironmentDeclaration(declaration)) produced = [];
    else if (declaration.kind === "def") produced = [lowerDef(declaration, globals, context)];
    else if (declaration.kind === "extension" && declaration.op === "lean.theorem") produced = [lowerRflTheorem(declaration, globals, context)];
    else if (declaration.kind === "extension" && declaration.op === "lean.class.decl") produced = lowerP2ClassDeclarations(declaration, context);
    else if (declaration.kind === "extension" && declaration.op === "lean.instance.decl") produced = context.classes.size ? [lowerP2InstanceDeclaration(declaration, globals, context)] : [lowerWaveHAddInstance(declaration, globals, context)];
    else if (declaration.kind === "extension" && declaration.op === "lean.inductive.decl") produced = [lowerP1InductiveDeclaration(declaration, context)];
    else if (declaration.kind === "extension" && declaration.op === "lean.structure.decl") produced = lowerP1StructureDeclarations(declaration, context);
    else throw new UnifiedBridgeUnsupported(`Production profile supports defs, rfl theorems, restricted instances, non-indexed inductives, simple structures, project modules, namespaces/open/export environment commands; got '${declaration.kind === "extension" ? declaration.op : declaration.kind}'`);
    out.push(...produced);
    for (const core of produced) {
      globals.add(core.name);
      if (core.kind === "inductive") for (const ctor of core.constructors) globals.add(ctor.name);
    }
  }
  return out;
}

function libraryDeclarationsForContext(context: LoweringContext): CoreDeclaration[] {
  const library: CoreDeclaration[] = [];
  if (context.requiresIntAdd) { context.requiresInt = true; context.requiresNatSub = true; context.requiresAdd = true; }
  if (context.requiresDecidable) context.requiresNatOrder = true;
  if (context.requiresNatMul) library.push(coreNatMulDefinition());
  if (context.requiresNatSub) library.push(coreNatPredDefinition(), coreNatSubDefinition());
  if (context.requiresNatOrder) library.push(coreNatLeDeclaration(), coreNatLtDefinition());
  if (context.requiresNatBeq) library.push(coreNatBeqDefinition());
  if (context.requiresNatBle) library.push(coreNatBleDefinition(), coreNatBltDefinition());
  if (context.requiresDecidable) library.push(...coreWaveBDecidableDeclarations());
  if (context.requiresAdd) library.push(...coreWaveGAddDeclarations());
  if (context.requiresHAdd) library.push(...coreWaveFHAddDeclarations());
  if (context.requiresOption) library.push(coreP3OptionDeclaration());
  if (context.requiresList) library.push(coreP3ListDeclaration());
  if (context.requiresExcept) library.push(coreP3ExceptDeclaration());
  if (context.requiresInt) library.push(coreP3IntDeclaration(), ...coreP3IntBasicDefinitions());
  if (context.requiresString) library.push(coreP6StringDeclaration(context));
  if (context.requiresStringBeq) library.push(coreP6StringBeqDefinition(context));
  if (context.requiresIntAdd) library.push(...coreP3IntAddDefinitions());
  return library;
}

interface P1AdtVariantPayload {
  readonly name: string;
  readonly params: readonly IRParam[];
  readonly fields: readonly IRParam[];
  readonly resultType: IRType;
}
interface P1AdtPayload {
  readonly name: string;
  readonly sourceName: string;
  readonly params: readonly IRParam[];
  readonly indices: readonly IRParam[];
  readonly resultSort: IRType;
  readonly variants: readonly P1AdtVariantPayload[];
  readonly indexed: boolean;
}
interface P1StructureField { readonly name: string; readonly type: IRType; }
interface P1StructurePayload {
  readonly name: string;
  readonly sourceName: string;
  readonly params: readonly IRParam[];
  readonly fields: readonly P1StructureField[];
  readonly ownFields: readonly P1StructureField[];
  readonly generated?: { readonly constructor?: string; readonly projections?: readonly string[]; readonly parentProjections?: readonly string[] };
  readonly family?: string;
}
interface P1AdtMatchPayload {
  readonly typeName: string;
  readonly cases: readonly { readonly variant: string; readonly binders: readonly string[]; readonly fieldNames?: readonly string[] }[];
}
interface P1RecursiveFrame {
  readonly defName: string;
  readonly structuralParam: string;
  readonly paramNames: readonly string[];
  readonly runtimeParamNames: readonly string[];
  branchIHByField: ReadonlyMap<string,string> | undefined;
}
interface P2ClassField { readonly name: string; readonly type: IRType; readonly inheritedFrom?: string; }
interface P2ClassPayload {
  readonly name: string; readonly sourceName: string; readonly params: readonly IRParam[];
  readonly fields: readonly P2ClassField[]; readonly ownFields?: readonly P2ClassField[];
  readonly parentTypes?: readonly IRType[]; readonly family?: string;
}

interface LoweringContext {
  requiresNatMul: boolean; requiresNatSub: boolean; requiresNatOrder: boolean; requiresNatBeq: boolean; requiresNatBle: boolean; requiresDecidable: boolean; requiresAdd: boolean; requiresHAdd: boolean; requiresOption: boolean; requiresList: boolean; requiresExcept: boolean; requiresInt: boolean; requiresIntAdd: boolean; requiresString: boolean; requiresStringBeq: boolean;
  readonly adts: Map<string,P1AdtPayload>;
  readonly structures: Map<string,P1StructurePayload>;
  readonly classes: Map<string,P2ClassPayload>;
  recursive: P1RecursiveFrame | undefined;
  readonly stringLiterals: Map<string,string>;
}
function makeLoweringContext(): LoweringContext {
  return { requiresNatMul:false, requiresNatSub:false, requiresNatOrder:false, requiresNatBeq:false, requiresNatBle:false, requiresDecidable:false, requiresAdd:false, requiresHAdd:false, requiresOption:false, requiresList:false, requiresExcept:false, requiresInt:false, requiresIntAdd:false, requiresString:false, requiresStringBeq:false, adts:new Map(), structures:new Map(), classes:new Map(), recursive:undefined, stringLiterals:new Map() };
}

function p1FamilyApplication(name: string, params: readonly IRParam[], locals: readonly string[], globals: ReadonlySet<string>): Term {
  let term: Term = c(name);
  for (const param of params) term = app(term, lowerVar(param.name, locals, globals));
  return term;
}

function lowerP1InductiveDeclaration(decl: IRExtensionDecl, context: LoweringContext): CoreDeclaration {
  const payload = decl.payload as P1AdtPayload;
  if (!payload?.name || payload.indexed || payload.indices?.length) {
    throw new UnifiedBridgeUnsupported("Production P1 currently lowers non-indexed inductives only");
  }
  if (payload.resultSort.form !== "sort" || payload.resultSort.sortAlias !== "Type" || payload.resultSort.universe?.kind !== "zero") {
    throw new UnifiedBridgeUnsupported(`Production P1 inductive '${payload.name}' must inhabit Type 0`);
  }
  if (payload.params.some(param => param.type.form === "sort" && param.type.universe?.kind !== "zero")) {
    throw new UnifiedBridgeUnsupported(`Production P1 inductive '${payload.name}' has a non-Type-0 parameter`);
  }
  context.adts.set(payload.name, payload);
  const paramNames = payload.params.map(p => p.name);
  let type: Term = { tag:"sort", level:levelOfNat(1) };
  for (let i=payload.params.length-1;i>=0;i--) {
    const param=payload.params[i]!;
    type={ tag:"pi", domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context), body:type, binderInfo:lowerBinderInfo(param.binderInfo) };
  }
  const constructors = payload.variants.map(variant => {
    const fields = variant.params;
    const allNames=[...paramNames,...fields.map(f=>f.name)];
    let ctorType=lowerType(variant.resultType,allNames,new Set(),context);
    for(let i=fields.length-1;i>=0;i--){
      const field=fields[i]!;
      ctorType={tag:"pi",domain:lowerType(field.type,[...paramNames,...fields.slice(0,i).map(f=>f.name)],new Set(),context),body:ctorType,binderInfo:lowerBinderInfo(field.binderInfo)};
    }
    for(let i=payload.params.length-1;i>=0;i--){
      const param=payload.params[i]!;
      ctorType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:ctorType,binderInfo:lowerBinderInfo(param.binderInfo)};
    }
    return {name:`${payload.name}.${variant.name}`,type:ctorType};
  });
  return {kind:"inductive",name:payload.name,levelParams:[],type,numParams:payload.params.length,numIndices:0,constructors};
}

function lowerP1StructureDeclarations(decl: IRExtensionDecl, context: LoweringContext): CoreDeclaration[] {
  const payload=decl.payload as P1StructurePayload;
  if(!payload?.name) throw new UnifiedBridgeUnsupported("Production P1 malformed structure declaration");
  if(payload.ownFields.length!==payload.fields.length || (payload.generated?.parentProjections?.length ?? 0)!==0) {
    throw new UnifiedBridgeUnsupported(`Production P1 structure '${payload.name}' does not yet support inheritance`);
  }
  if(payload.params.some(param=>!param.isTypeParam)) {
    throw new UnifiedBridgeUnsupported(`Production P1 structure '${payload.name}' currently supports Type-valued parameters only`);
  }
  // This first production cut supports ordinary nondependent record fields. A
  // later P1 slice can reconstruct dependent projection result types.
  if(payload.fields.some(field=>field.type.form==="term")) {
    throw new UnifiedBridgeUnsupported(`Production P1 structure '${payload.name}' does not yet support dependent field types`);
  }
  context.structures.set(payload.name,payload);
  const paramNames=payload.params.map(p=>p.name);
  let type:Term={tag:"sort",level:levelOfNat(1)};
  for(let i=payload.params.length-1;i>=0;i--){
    const param=payload.params[i]!;
    type={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:type,binderInfo:lowerBinderInfo(param.binderInfo)};
  }
  const fieldParams:IRParam[]=payload.fields.map(field=>({name:field.name,type:field.type,binderInfo:"explicit"}));
  const allNames=[...paramNames,...fieldParams.map(f=>f.name)];
  let ctorType=p1FamilyApplication(payload.name,payload.params,allNames,new Set());
  for(let i=fieldParams.length-1;i>=0;i--){
    const field=fieldParams[i]!;
    ctorType={tag:"pi",domain:lowerType(field.type,[...paramNames,...fieldParams.slice(0,i).map(f=>f.name)],new Set(),context),body:ctorType,binderInfo:"explicit"};
  }
  for(let i=payload.params.length-1;i>=0;i--){
    const param=payload.params[i]!;
    ctorType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:ctorType,binderInfo:lowerBinderInfo(param.binderInfo)};
  }
  const inductive:CoreDeclaration={kind:"inductive",name:payload.name,levelParams:[],type,numParams:payload.params.length,numIndices:0,constructors:[{name:`${payload.name}.mk`,type:ctorType}]};

  const projections:CoreDeclaration[] = payload.fields.map((field,index) => {
    const recordName="__p1_record";
    const recordType=p1FamilyApplication(payload.name,payload.params,paramNames,new Set());
    const resultType=lowerType(field.type,paramNames,new Set(),context);
    let projectionType:Term={tag:"pi",domain:recordType,body:liftTerm(resultType),binderInfo:"explicit"};
    for(let i=payload.params.length-1;i>=0;i--){
      const param=payload.params[i]!;
      projectionType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:projectionType,binderInfo:lowerBinderInfo(param.binderInfo)};
    }

    // Build the structure projection from the generated one-constructor
    // recursor, so the Lean oracle does not depend on raw kernel projection
    // syntax and the projection itself remains independently kernel-checked.
    //
    // Important: the recursor application lives *inside* the record lambda.
    // For a parameterized structure such as Cell(A), the local context there
    // is [A, record], so A is #1 and record is #0.  Building the recursor in
    // the parameter-only context accidentally passed #0 (the record) as A.
    // Keep the real outer context explicit so all free parameter references
    // are shifted correctly under the record/motive/minor binders.
    const recordLocals=[...paramNames,recordName];
    const family=p1FamilyApplication(payload.name,payload.params,recordLocals,new Set());
    const resultInRecordContext=lowerType(field.type,recordLocals,new Set(),context);
    const motive:Term={tag:"lam",domain:family,body:liftTerm(resultInRecordContext),binderInfo:"explicit"};
    const fieldNames=payload.fields.map(f=>f.name);
    let minor:Term={tag:"bvar",index:fieldNames.length-1-index};
    for(let i=fieldNames.length-1;i>=0;i--){
      minor={
        tag:"lam",
        domain:lowerType(payload.fields[i]!.type,[...recordLocals,...fieldNames.slice(0,i)],new Set(),context),
        body:minor,
        binderInfo:"explicit",
      };
    }
    let rec:Term={tag:"const",name:`${payload.name}.rec`,levels:[universeForType(field.type)]};
    for(const param of payload.params) rec=app(rec,lowerVar(param.name,recordLocals,new Set()));
    rec=app(rec,motive);
    rec=app(rec,minor);
    rec=app(rec,lowerVar(recordName,recordLocals,new Set()));
    const familyAtParams=p1FamilyApplication(payload.name,payload.params,paramNames,new Set());
    let value:Term={tag:"lam",domain:familyAtParams,body:rec,binderInfo:"explicit"};
    for(let i=payload.params.length-1;i>=0;i--){
      const param=payload.params[i]!;
      value={tag:"lam",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:value,binderInfo:lowerBinderInfo(param.binderInfo)};
    }
    return {kind:"definition",name:`${payload.name}.${field.name}`,levelParams:[],type:projectionType,value,reducibility:"regular"};
  });
  return [inductive,...projections];
}
function lowerP2ClassDeclarations(decl: IRExtensionDecl, context: LoweringContext): CoreDeclaration[] {
  const payload = decl.payload as P2ClassPayload;
  if (!payload?.name) throw new UnifiedBridgeUnsupported("Production P2 malformed class declaration");
  if ((payload.parentTypes?.length ?? 0) > 1) throw new UnifiedBridgeUnsupported(`Production P2 class '${payload.name}' currently supports at most one parent class`);
  if (payload.params.some(p => !p.isTypeParam)) throw new UnifiedBridgeUnsupported(`Production P2 class '${payload.name}' currently supports Type-valued class parameters only`);
  context.classes.set(payload.name, payload);
  const paramNames = payload.params.map(p => p.name);
  let type: Term = { tag:"sort", level:levelOfNat(1) };
  for (let i=payload.params.length-1;i>=0;i--) {
    const param=payload.params[i]!;
    type={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:type,binderInfo:lowerBinderInfo(param.binderInfo)};
  }
  const fieldParams: IRParam[] = payload.fields.map(f=>({name:f.name,type:f.type,binderInfo:"explicit"}));
  let ctorType = p1ClassFamilyApplication(payload.name,payload.params,[...paramNames,...fieldParams.map(f=>f.name)]);
  for (let i=fieldParams.length-1;i>=0;i--) {
    const f=fieldParams[i]!;
    ctorType={tag:"pi",domain:lowerType(f.type,[...paramNames,...fieldParams.slice(0,i).map(x=>x.name)],new Set(),context),body:ctorType,binderInfo:"explicit"};
  }
  for (let i=payload.params.length-1;i>=0;i--) {
    const param=payload.params[i]!;
    ctorType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:ctorType,binderInfo:lowerBinderInfo(param.binderInfo)};
  }
  const inductive: CoreDeclaration={kind:"inductive",name:payload.name,levelParams:[],type,numParams:payload.params.length,numIndices:0,constructors:[{name:`${payload.name}.mk`,type:ctorType}]};
  const projections: CoreDeclaration[] = payload.fields.map((field,index)=>{
    const selfName="__p2_self";
    const selfType=p1ClassFamilyApplication(payload.name,payload.params,paramNames);
    const resultType=lowerType(field.type,paramNames,new Set(),context);
    let projectionType:Term={tag:"pi",domain:selfType,body:liftTerm(resultType),binderInfo:"instImplicit"};
    for(let i=payload.params.length-1;i>=0;i--){const param=payload.params[i]!; projectionType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:projectionType,binderInfo:"implicit"};}
    const realLocals=[...paramNames,selfName];
    const family=p1ClassFamilyApplication(payload.name,payload.params,realLocals);
    const resultInSelf=lowerType(field.type,realLocals,new Set(),context);
    const motive:Term={tag:"lam",domain:family,body:liftTerm(resultInSelf),binderInfo:"explicit"};
    const fieldNames=payload.fields.map(f=>f.name);
    let minor:Term={tag:"bvar",index:fieldNames.length-1-index};
    for(let i=fieldNames.length-1;i>=0;i--){minor={tag:"lam",domain:lowerType(payload.fields[i]!.type,[...realLocals,...fieldNames.slice(0,i)],new Set(),context),body:minor,binderInfo:"explicit"};}
    let rec:Term={tag:"const",name:`${payload.name}.rec`,levels:[universeForType(field.type)]};
    for(const param of payload.params) rec=app(rec,lowerVar(param.name,realLocals,new Set()));
    rec=app(rec,motive); rec=app(rec,minor); rec=app(rec,lowerVar(selfName,realLocals,new Set()));
    let value:Term={tag:"lam",domain:selfType,body:rec,binderInfo:"instImplicit"};
    for(let i=payload.params.length-1;i>=0;i--){const param=payload.params[i]!; value={tag:"lam",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:value,binderInfo:"implicit"};}
    return {kind:"definition",name:`${payload.name}.${field.name}`,levelParams:[],type:projectionType,value,reducibility:"regular"};
  });
  const parentProjections: CoreDeclaration[] = [];
  for (const parentType of payload.parentTypes ?? []) {
    if (parentType.form !== "nominal" || !parentType.family?.startsWith("lean.class:")) throw new UnifiedBridgeUnsupported(`Production P2 class '${payload.name}' has malformed parent type`);
    const parentName=parentType.family.slice("lean.class:".length);
    const parent=context.classes.get(parentName);
    if(!parent) throw new UnifiedBridgeUnsupported(`Production P2 class '${payload.name}' parent '${parentName}' must be declared earlier`);
    const selfName="__p2_parent_self";
    const selfType=p1ClassFamilyApplication(payload.name,payload.params,paramNames);
    const parentResult=lowerType(parentType,paramNames,new Set(),context);
    let projType:Term={tag:"pi",domain:selfType,body:liftTerm(parentResult),binderInfo:"instImplicit"};
    for(let i=payload.params.length-1;i>=0;i--){const param=payload.params[i]!; projType={tag:"pi",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:projType,binderInfo:"implicit"};}
    const realLocals=[...paramNames,selfName];
    const family=p1ClassFamilyApplication(payload.name,payload.params,realLocals);
    const parentInSelf=lowerType(parentType,realLocals,new Set(),context);
    const motive:Term={tag:"lam",domain:family,body:liftTerm(parentInSelf),binderInfo:"explicit"};
    const fieldNames=payload.fields.map(f=>f.name);
    let parentValue:Term=c(`${parentName}.mk`);
    for(const arg of parentType.args ?? []) parentValue=app(parentValue,arg.kind==="type"?lowerType(arg.value,[...realLocals,...fieldNames],new Set(),context):lowerExpr(arg.value,[...realLocals,...fieldNames],new Set(),context));
    for(const pf of parent.fields){
      const idx=payload.fields.findIndex(f=>f.name===pf.name);
      if(idx<0) throw new UnifiedBridgeUnsupported(`Production P2 child class '${payload.name}' does not carry inherited field '${pf.name}'`);
      parentValue=app(parentValue,{tag:"bvar",index:fieldNames.length-1-idx});
    }
    let minor=parentValue;
    for(let i=fieldNames.length-1;i>=0;i--){minor={tag:"lam",domain:lowerType(payload.fields[i]!.type,[...realLocals,...fieldNames.slice(0,i)],new Set(),context),body:minor,binderInfo:"explicit"};}
    let rec:Term={tag:"const",name:`${payload.name}.rec`,levels:[universeForType(parentType)]};
    for(const param of payload.params) rec=app(rec,lowerVar(param.name,realLocals,new Set()));
    rec=app(rec,motive); rec=app(rec,minor); rec=app(rec,lowerVar(selfName,realLocals,new Set()));
    let value:Term={tag:"lam",domain:selfType,body:rec,binderInfo:"instImplicit"};
    for(let i=payload.params.length-1;i>=0;i--){const param=payload.params[i]!; value={tag:"lam",domain:lowerType(param.type,paramNames.slice(0,i),new Set(),context),body:value,binderInfo:"implicit"};}
    parentProjections.push({kind:"definition",name:`${payload.name}.to${parentName.split(".").at(-1)!}`,levelParams:[],type:projType,value,reducibility:"regular"});
  }
  return [inductive,...projections,...parentProjections];
}
function p1ClassFamilyApplication(name:string, params:readonly IRParam[], locals:readonly string[]):Term {
  let t:Term=c(name); for(const p of params) t=app(t,lowerVar(p.name,locals,new Set())); return t;
}
function lowerP2ClassProject(expr: IRExpr & {kind:"op"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as {className?:string;fieldName?:string;methodParamCount?:number}|undefined;
  if(!payload?.className || !payload.fieldName) throw new UnifiedBridgeUnsupported("Production P2 malformed class projection");
  const descriptor=context.classes.get(payload.className);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P2 unknown class '${payload.className}'`);
  const methodCount=payload.methodParamCount ?? 0;
  const selfIndex=expr.args.length-methodCount-1;
  const self=expr.args[selfIndex];
  if(!self || self.type.form!=="nominal" || self.type.family!==`lean.class:${payload.className}`) throw new UnifiedBridgeUnsupported(`Production P2 class projection '${payload.className}.${payload.fieldName}' lacks matching self dictionary`);
  const typeArgs=self.type.args ?? [];
  if(typeArgs.length!==descriptor.params.length || typeArgs.some(a=>a.kind!=="type")) throw new UnifiedBridgeUnsupported(`Production P2 class projection '${payload.className}.${payload.fieldName}' cannot recover class Type arguments`);
  let term:Term=c(`${payload.className}.${payload.fieldName}`);
  for(const a of typeArgs){ if(a.kind!=="type") throw new UnifiedBridgeUnsupported("unreachable"); term=app(term,lowerType(a.value,locals,globals,context)); }
  term=app(term,lowerExpr(self,locals,globals,context));
  for(const arg of expr.args.slice(selfIndex+1)) term=app(term,lowerExpr(arg,locals,globals,context));
  return term;
}
function lowerP2InstanceDeclaration(decl: IRExtensionDecl, globals: ReadonlySet<string>, context: LoweringContext): CoreDeclaration {
  const payload=decl.payload as WaveHInstancePayload;
  if(!payload?.name || payload.visibility!=="global") throw new UnifiedBridgeUnsupported("Production P2 currently integrates named global instances only");
  const target=payload.targetType;
  if(target?.form!=="nominal" || !target.family?.startsWith("lean.class:")) throw new UnifiedBridgeUnsupported(`Production P2 instance '${payload.name}' target is not a class`);
  const className=target.family.slice("lean.class:".length);
  const descriptor=context.classes.get(className);
  if(!descriptor) return lowerWaveHAddInstance(decl,globals,context);
  if(payload.fields.length!==descriptor.fields.length || payload.fields.some((f,i)=>f.name!==descriptor.fields[i]!.name)) throw new UnifiedBridgeUnsupported(`Production P2 instance '${payload.name}' must provide class fields in declared order`);
  const locals=payload.params.map(p=>p.name);
  let dictionaryType=lowerType(target,locals,globals,context);
  let dictionary:Term=c(`${className}.mk`);
  for(const arg of target.args ?? []) dictionary=app(dictionary,arg.kind==="type"?lowerType(arg.value,locals,globals,context):lowerExpr(arg.value,locals,globals,context));
  for(const field of payload.fields) dictionary=app(dictionary,lowerExpr(field.value,locals,globals,context));
  let type=dictionaryType, value=dictionary;
  for(let i=payload.params.length-1;i>=0;i--){const p=payload.params[i]!; const domain=lowerType(p.type,locals.slice(0,i),globals,context); type={tag:"pi",domain,body:type,binderInfo:lowerBinderInfo(p.binderInfo)}; value={tag:"lam",domain,body:value,binderInfo:lowerBinderInfo(p.binderInfo)};}
  return {kind:"definition",name:payload.name,levelParams:[],type,value,reducibility:"regular"};
}

function p1TypeSubstitute(type: IRType, typeSubs: ReadonlyMap<string,IRType>): IRType {
  if(type.form==="nominal" && type.family==="core.typevar") return typeSubs.get(type.displayName) ?? type;
  if(type.args?.length){
    return {...type,args:type.args.map(arg=>arg.kind==="type"?{kind:"type" as const,value:p1TypeSubstitute(arg.value,typeSubs)}:arg)};
  }
  if(type.form==="pi" && type.domain && type.codomain){
    return {...type,domain:p1TypeSubstitute(type.domain,typeSubs),codomain:p1TypeSubstitute(type.codomain,typeSubs)};
  }
  return type;
}

function p1TypeArgumentTerms(type: IRType, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term[] {
  return (type.args ?? []).map(arg=>arg.kind==="type"?lowerType(arg.value,locals,globals,context):lowerExpr(arg.value,locals,globals,context));
}

function p1IsDirectRecursiveType(type: IRType, name: string): boolean {
  return type.form==="nominal" && type.family===`core.adt:${name}`;
}

function lowerP1InductiveConstruct(expr: IRExpr & {kind:"op"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as {typeName?:string;variant?:string}|undefined;
  if(!payload?.typeName || !payload.variant) throw new UnifiedBridgeUnsupported("Production P1 malformed inductive constructor");
  const descriptor=context.adts.get(payload.typeName);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P1 unknown inductive '${payload.typeName}'`);
  let term:Term=c(`${payload.typeName}.${payload.variant}`);
  for(const arg of p1TypeArgumentTerms(expr.type,locals,globals,context)) term=app(term,arg);
  for(const arg of expr.args) term=app(term,lowerExpr(arg,locals,globals,context));
  return term;
}

function lowerP1StructureConstruct(expr: IRExpr & {kind:"op"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as {structureName?:string}|undefined;
  if(!payload?.structureName) throw new UnifiedBridgeUnsupported("Production P1 malformed structure construction");
  const descriptor=context.structures.get(payload.structureName);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P1 unknown structure '${payload.structureName}'`);
  let term:Term=c(`${payload.structureName}.mk`);
  for(const arg of p1TypeArgumentTerms(expr.type,locals,globals,context)) term=app(term,arg);
  for(const arg of expr.args) term=app(term,lowerExpr(arg,locals,globals,context));
  return term;
}

function lowerP1StructureProject(expr: IRExpr & {kind:"op"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as {structureName?:string;fieldName?:string}|undefined;
  if(!payload?.structureName || !payload.fieldName || expr.args.length<1) throw new UnifiedBridgeUnsupported("Production P1 malformed structure projection");
  const descriptor=context.structures.get(payload.structureName);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P1 unknown structure '${payload.structureName}'`);
  const index=descriptor.fields.findIndex(field=>field.name===payload.fieldName);
  if(index<0) throw new UnifiedBridgeUnsupported(`Production P1 unknown field '${payload.structureName}.${payload.fieldName}'`);
  const record=expr.args.at(-1)!;
  let term:Term=c(`${payload.structureName}.${payload.fieldName}`);
  for(const arg of p1TypeArgumentTerms(record.type,locals,globals,context)) term=app(term,arg);
  return app(term,lowerExpr(record,locals,globals,context));
}

function lowerP1StructureUpdate(expr: IRExpr & {kind:"op"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as {structureName?:string;fieldPaths?:readonly (readonly string[])[]}|undefined;
  const base=expr.args[0];
  if(!payload?.structureName || !base || !payload.fieldPaths) throw new UnifiedBridgeUnsupported("Production P1 malformed structure update");
  const descriptor=context.structures.get(payload.structureName);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P1 unknown update structure '${payload.structureName}'`);
  if(payload.fieldPaths.some(path=>path.length!==1)) throw new UnifiedBridgeUnsupported("Production P1 nested structure updates are not integrated yet");
  if(payload.fieldPaths.length!==expr.args.length-1) throw new UnifiedBridgeUnsupported("Production P1 structure update field/value arity mismatch");
  const updates=new Map<string,IRExpr>();
  payload.fieldPaths.forEach((path,index)=>updates.set(path[0]!,expr.args[index+1]!));
  for(const key of updates.keys()) if(!descriptor.fields.some(field=>field.name===key)) throw new UnifiedBridgeUnsupported(`Production P1 unknown updated field '${payload.structureName}.${key}'`);

  const baseName="__p1_update_base";
  const bodyLocals=[...locals,baseName];
  let ctor:Term=c(`${payload.structureName}.mk`);
  for(const arg of p1TypeArgumentTerms(expr.type,bodyLocals,globals,context)) ctor=app(ctor,arg);
  for(const field of descriptor.fields){
    const replacement=updates.get(field.name);
    if(replacement){
      ctor=app(ctor,lowerExpr(replacement,bodyLocals,globals,context));
    } else {
      let projection:Term=c(`${payload.structureName}.${field.name}`);
      for(const arg of p1TypeArgumentTerms(base.type,bodyLocals,globals,context)) projection=app(projection,arg);
      ctor=app(ctor,app(projection,lowerVar(baseName,bodyLocals,globals)));
    }
  }
  return {tag:"let",type:lowerType(base.type,locals,globals,context),value:lowerExpr(base,locals,globals,context),body:ctor,nondep:false};
}

function lowerP1InductiveMatch(expr: IRExpr & {kind:"extension"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  const payload=expr.payload as P1AdtMatchPayload;
  const [scrutinee,...branchBodies]=expr.args;
  if(!scrutinee || !payload?.typeName) throw new UnifiedBridgeUnsupported("Production P1 malformed inductive match");
  const descriptor=context.adts.get(payload.typeName);
  if(!descriptor) throw new UnifiedBridgeUnsupported(`Production P1 unknown inductive match family '${payload.typeName}'`);
  if(descriptor.indexed || descriptor.indices.length) throw new UnifiedBridgeUnsupported("Production P1 indexed match remains outside this tranche");
  if(descriptor.params.some(param=>!param.isTypeParam)) throw new UnifiedBridgeUnsupported("Production P1 match currently supports Type-valued uniform parameters only");
  const typeArgs=scrutinee.type.args ?? [];
  if(typeArgs.length!==descriptor.params.length || typeArgs.some(arg=>arg.kind!=="type")) {
    throw new UnifiedBridgeUnsupported(`Production P1 match on '${payload.typeName}' has unsupported parameter instantiation`);
  }
  const typeSubs=new Map<string,IRType>();
  descriptor.params.forEach((param,index)=>{const arg=typeArgs[index]; if(param.isTypeParam && arg?.kind==="type") typeSubs.set(param.name,arg.value);});
  const resultType=lowerType(expr.type,locals,globals,context);
  const majorType=lowerType(scrutinee.type,locals,globals,context);
  const motive:Term={tag:"lam",domain:majorType,body:liftTerm(resultType),binderInfo:"explicit"};
  let rec:Term={tag:"const",name:`${payload.typeName}.rec`,levels:[universeForType(expr.type)]};
  for(const arg of typeArgs) {
    if (arg.kind !== "type") throw new UnifiedBridgeUnsupported(`Production P1 match on '${payload.typeName}' has a non-Type uniform parameter`);
    rec=app(rec,lowerType(arg.value,locals,globals,context));
  }
  rec=app(rec,motive);
  const caseMap=new Map(payload.cases.map((item,index)=>[item.variant,{item,body:branchBodies[index]}] as const));
  for(const variant of descriptor.variants){
    const found=caseMap.get(variant.name);
    if(!found?.body) throw new UnifiedBridgeUnsupported(`Production P1 match missing constructor '${variant.name}'`);
    const binders=[...found.item.binders];
    if(binders.length!==variant.params.length) throw new UnifiedBridgeUnsupported(`Production P1 constructor '${variant.name}' binder arity mismatch`);
    const fieldTypes=variant.params.map(param=>p1TypeSubstitute(param.type,typeSubs));
    const recursiveIndices=fieldTypes.flatMap((fieldType,index)=>p1IsDirectRecursiveType(fieldType,payload.typeName)?[index]:[]);
    const ihNames=recursiveIndices.map((_,i)=>`__p1_ih_${variant.name}_${i}`);
    const previousIH=context.recursive?.branchIHByField;
    if(context.recursive && scrutinee.kind==="var" && scrutinee.name===context.recursive.structuralParam){
      context.recursive.branchIHByField=new Map(recursiveIndices.map((fieldIndex,i)=>[binders[fieldIndex]!,ihNames[i]!] as const));
    }
    let minor=lowerExpr(found.body,[...locals,...binders,...ihNames],globals,context);
    if(context.recursive) context.recursive.branchIHByField=previousIH;
    for(let i=ihNames.length-1;i>=0;i--){
      const domain=lowerType(expr.type,[...locals,...binders,...ihNames.slice(0,i)],globals,context);
      minor={tag:"lam",domain,body:minor,binderInfo:"explicit"};
    }
    for(let i=binders.length-1;i>=0;i--){
      const domain=lowerType(fieldTypes[i]!,[...locals,...binders.slice(0,i)],globals,context);
      minor={tag:"lam",domain,body:minor,binderInfo:lowerBinderInfo(variant.params[i]!.binderInfo)};
    }
    rec=app(rec,minor);
  }
  return app(rec,lowerExpr(scrutinee,locals,globals,context));
}

interface TheoremPayload { readonly name: string; readonly sourceName: string; readonly params: readonly IRParam[]; readonly proof: string; }

interface WaveHInstancePayload {
  readonly name: string;
  readonly sourceName: string;
  readonly priority: number;
  readonly params: readonly IRParam[];
  readonly targetType: IRType;
  readonly fields: readonly { readonly name: string; readonly value: IRExpr }[];
  readonly visibility: "global" | "local" | "scoped";
}

function lowerWaveHAddInstance(decl: IRExtensionDecl, globals: ReadonlySet<string>, context: LoweringContext): CoreDeclaration {
  const payload = decl.payload as WaveHInstancePayload;
  if (!payload?.name || payload.visibility !== "global") throw new UnifiedBridgeUnsupported("Wave H integrates only named global Add(Nat) instances");
  if (payload.params?.length) throw new UnifiedBridgeUnsupported(`Wave H instance '${payload.name}' does not yet support instance parameters`);
  const target = payload.targetType;
  if (target?.form !== "nominal" || target.family !== "lean.class:Add" || target.args?.length !== 1 || target.args[0]?.kind !== "type" || !isNatType(target.args[0].value)) {
    throw new UnifiedBridgeUnsupported(`Wave H instance '${payload.name}' is restricted to Add(Nat)`);
  }
  if (payload.fields?.length !== 1 || payload.fields[0]?.name !== "add") throw new UnifiedBridgeUnsupported(`Wave H Add(Nat) instance '${payload.name}' requires exactly the 'add' field`);
  context.requiresAdd = true;
  const carrier = c("Nat");
  const dictionaryType = app(c(WAVEG_ADD), carrier);
  const field = lowerExpr(payload.fields[0].value, [], globals, context);
  const dictionary = app(app(c(WAVEG_ADD_MK), carrier), field);
  return { kind: "definition", name: payload.name, levelParams: [], type: dictionaryType, value: dictionary, reducibility: "regular" };
}

function lowerRflTheorem(decl: IRExtensionDecl, globals: ReadonlySet<string>, context: LoweringContext): CoreDeclaration {
  const payload = decl.payload as TheoremPayload;
  if (payload.proof.trim() !== "rfl") throw new UnifiedBridgeUnsupported(`UI4 theorem '${payload.name}' supports only the independently lowered proof 'rfl'`);
  if (!decl.args || decl.args.length !== 1) throw new UnifiedBridgeUnsupported(`UI4 theorem '${payload.name}' is missing its proposition`);
  const locals = payload.params.map(p => p.name);
  const proposition = decl.args[0]!;
  let type = lowerExpr(proposition, locals, globals, context);
  let value: Term;
  if (proposition.kind === "op" && proposition.op === "proof.eq" && proposition.args.length === 2) {
    const left = proposition.args[0]!;
    const carrier = lowerType(left.type, locals, globals, context);
    const universe = universeForType(left.type);
    value = app(app({ tag: "const", name: "Eq.refl", levels: [universe] }, carrier), lowerExpr(left, locals, globals, context));
  } else if (proposition.kind === "op" && (proposition.op === "lean.le" || proposition.op === "lean.lt") && proposition.args.length === 3) {
    const [, left, right] = proposition.args;
    if (!left || !right || !isNatType(left.type) || !isNatType(right.type)) {
      throw new UnifiedBridgeUnsupported(`UI4 rfl ordering theorem '${payload.name}' is restricted to canonical Nat ordering`);
    }
    context.requiresNatOrder = true;
    // Nat.le.refl proves n ≤ n. For Nat.lt, delta-reduction turns n < succ n
    // into succ n ≤ succ n, so the same constructor is the exact kernel proof.
    value = app(c("Nat.le.refl"), lowerExpr(right, locals, globals, context));
  } else {
    throw new UnifiedBridgeUnsupported(`UI4 theorem '${payload.name}' rfl lowering currently requires equality or canonical Nat ≤/<`);
  }
  for (let i = payload.params.length - 1; i >= 0; i--) {
    const p = payload.params[i]!;
    const domain = lowerType(p.type, locals.slice(0, i), globals, context);
    type = { tag: "pi", domain, body: type, binderInfo: lowerBinderInfo(p.binderInfo) };
    value = { tag: "lam", domain, body: value, binderInfo: lowerBinderInfo(p.binderInfo) };
  }
  return { kind: "theorem", name: payload.name, levelParams: [], type, value };
}

function lowerDef(def: IRDef, globals: ReadonlySet<string>, context: LoweringContext): CoreDeclaration {
  if (def.universeParams?.length) throw new UnifiedBridgeUnsupported(`Production P1 does not yet lower universe-polymorphic def '${def.name}'`);
  if (def.proofParams?.length || def.annotations?.length) {
    throw new UnifiedBridgeUnsupported(`Production P1 does not yet lower annotated/proof-parameter def '${def.name}'`);
  }
  if (def.sourceForm === "equations" && (!def.equations?.length || !def.equationParamNames?.length)) {
    throw new UnifiedBridgeUnsupported(`Production P1 malformed equation-clause def '${def.name}'`);
  }
  const structural = def.termination?.kind === "structural" ? def.termination : undefined;
  if (def.termination && !structural) throw new UnifiedBridgeUnsupported(`Production P1 currently lowers structural recursion only for '${def.name}'`);
  if (structural) {
    const runtimeParams=def.params.filter(param=>!param.isTypeParam);
    if(!runtimeParams.length || !runtimeParams.some(param=>param.name===structural.parameter)) {
      throw new UnifiedBridgeUnsupported(`Production P1 structural recursion for '${def.name}' requires a runtime structural parameter`);
    }
    if(def.body.kind!=="extension" || !(def.body.op==="lean.inductive.match" || def.body.op==="core.list.match") || def.body.args[0]?.kind!=="var" || def.body.args[0].name!==structural.parameter) {
      throw new UnifiedBridgeUnsupported(`Production P1 structural recursion for '${def.name}' currently requires a top-level match on '${structural.parameter}'`);
    }
  }
  const localNames = def.params.map(p => p.name);
  const returnType = lowerType(def.returnType, localNames, globals, context);
  let type: Term = returnType;
  for (let i = def.params.length - 1; i >= 0; i--) {
    const p = def.params[i]!;
    type = { tag: "pi", domain: lowerType(p.type, localNames.slice(0, i), globals, context), body: type, binderInfo: lowerBinderInfo(p.binderInfo) };
  }
  const previousRecursive=context.recursive;
  if(structural) context.recursive={
    defName:def.semanticName ?? def.name,
    structuralParam:structural.parameter,
    paramNames:localNames,
    runtimeParamNames:def.params.filter(param=>!param.isTypeParam).map(param=>param.name),
    branchIHByField:undefined,
  };
  let value:Term;
  try { value = lowerExpr(def.body, localNames, globals, context); }
  finally { context.recursive=previousRecursive; }
  for (let i = def.params.length - 1; i >= 0; i--) {
    const p = def.params[i]!;
    value = { tag: "lam", domain: lowerType(p.type, localNames.slice(0, i), globals, context), body: value, binderInfo: lowerBinderInfo(p.binderInfo) };
  }
  return { kind: "definition", name: def.semanticName ?? def.name, levelParams: [], type, value, reducibility: "regular" };
}

function lowerBinderInfo(info: NextBinderInfo): BinderInfo {
  switch (info) {
    case "explicit": return "explicit";
    case "implicit": return "implicit";
    case "strictImplicit": return "strictImplicit";
    case "instance": return "instImplicit";
  }
}

function lowerType(type: IRType, locals: readonly string[], globals: ReadonlySet<string> = new Set(), context?: LoweringContext): Term {
  if (type.form === "nominal" && type.id === "Nat" && !(type.args?.length)) return c("Nat");
  if (type.form === "nominal" && type.id === "Bool" && !(type.args?.length)) return c("Bool");
  if (type.form === "nominal" && type.id === "Int" && !(type.args?.length)) { if(context) context.requiresInt=true; return c("Int"); }
  if (type.form === "nominal" && type.id === "String" && !(type.args?.length)) { if(context) context.requiresString=true; return c("ProofScript.Core.P6.String"); }
  if (type.form === "sort" && type.sortAlias === "Prop") return { tag: "sort", level: levelOfNat(0) };
  if (type.form === "sort" && type.sortAlias === "Type" && type.universe?.kind === "zero") return { tag: "sort", level: levelOfNat(1) };
  if (type.form === "pi" && type.domain && type.codomain) {
    // Production P1 carries ordinary/higher-order function values through Core
    // as Pi types.  Lower the codomain in the extended binder context so free
    // outer type variables are shifted correctly and a named dependent binder
    // remains available when the frontend provides one.
    const binderName=type.binder?.name && type.binder.name!=="_" ? type.binder.name : "__p1_fn_arg";
    return {
      tag:"pi",
      domain:lowerType(type.domain,locals,globals,context),
      body:lowerType(type.codomain,[...locals,binderName],globals,context),
      binderInfo:lowerBinderInfo(type.binder?.binderInfo ?? "explicit"),
    };
  }
  if (type.form === "nominal" && type.family?.startsWith("lean.class:") && context?.classes.has(type.family.slice("lean.class:".length))) {
    const name = type.family.slice("lean.class:".length);
    let term: Term = c(name);
    for (const arg of type.args ?? []) term = app(term, arg.kind === "type" ? lowerType(arg.value, locals, globals, context) : lowerExpr(arg.value, locals, globals, context));
    return term;
  }
  if (type.form === "nominal" && type.family === "lean.class:Add" && type.args?.length === 1 && type.args[0]?.kind === "type") {
    if (context) context.requiresAdd = true;
    return app(c(WAVEG_ADD), lowerType(type.args[0].value, locals, globals, context));
  }
  if (type.form === "nominal" && type.family === "lean.class:HAdd" && type.args?.length === 3 && type.args.every(a => a.kind === "type")) {
    if (context) context.requiresHAdd = true;
    return type.args.reduce<Term>((term, arg) => app(term, lowerType(arg.value, locals, globals, context)), c(WAVEF_HADD));
  }
  if (type.form === "nominal" && type.family === "core.typevar") return lowerVar(type.displayName, locals, globals);
  if (type.form === "nominal" && type.family?.startsWith("core.adt:")) {
    const name=type.family.slice("core.adt:".length);
    let term:Term=c(name);
    for(const arg of type.args ?? []) term=app(term,arg.kind==="type"?lowerType(arg.value,locals,globals,context):lowerExpr(arg.value,locals,globals,context ?? makeLoweringContext()));
    return term;
  }
  if (type.form === "nominal" && type.family?.startsWith("lean.structure:")) {
    const name=type.family.slice("lean.structure:".length);
    let term:Term=c(name);
    for(const arg of type.args ?? []) term=app(term,arg.kind==="type"?lowerType(arg.value,locals,globals,context):lowerExpr(arg.value,locals,globals,context ?? makeLoweringContext()));
    return term;
  }
  if (type.form === "nominal" && type.family === "core.option") {
    if(context) context.requiresOption=true;
    const inner=optionInnerType(type);
    return app(c("ProofScript.Core.P3.Option"),lowerType(inner,locals,globals,context));
  }
  if (type.form === "nominal" && type.family === "core.list") {
    if(context) context.requiresList=true;
    const inner=listInnerType(type);
    return app(c("ProofScript.Core.P3.List"),lowerType(inner,locals,globals,context));
  }
  if (type.form === "nominal" && type.family === "core.except") {
    if(context) context.requiresExcept=true;
    const [error,value]=exceptInnerTypes(type);
    return app(app(c("ProofScript.Core.P3.Except"),lowerType(error,locals,globals,context)),lowerType(value,locals,globals,context));
  }
  if (type.form === "term" && type.term) return lowerExpr(type.term, locals, globals, context ?? makeLoweringContext());
  if (type.form === "nominal" && type.family === "lean.decidable" && type.args?.length === 1 && type.args[0]?.kind === "term") {
    if (context) context.requiresDecidable = true;
    const proposition = lowerExpr(type.args[0].value, locals, globals, context ?? makeLoweringContext());
    return app(c(WAVEB_DECIDABLE), proposition);
  }
  throw new UnifiedBridgeUnsupported(`UI4 cannot lower type '${type.displayName}' (${type.form}/${type.id}) to Core v71 K3-TB`);
}

function coreP3IntDeclaration(): CoreDeclaration {
  const nat=c("Nat"), int=c("Int"), type0:Term={tag:"sort",level:levelOfNat(1)};
  return {
    kind:"inductive", name:"Int", levelParams:[], type:type0, numParams:0, numIndices:0,
    constructors:[
      {name:"Int.ofNat",type:{tag:"pi",domain:nat,binderInfo:"explicit",body:int}},
      {name:"Int.negSucc",type:{tag:"pi",domain:nat,binderInfo:"explicit",body:int}},
    ],
  };
}

function coreP3IntBasicDefinitions(): CoreDeclaration[] {
  const nat=c("Nat"), int=c("Int");
  const rec=(result:Term,ofNatMinor:Term,negSuccMinor:Term,input:Term):Term=>{
    const motive:Term={tag:"lam",domain:int,binderInfo:"explicit",body:liftTerm(result)};
    let t:Term={tag:"const",name:"Int.rec",levels:[levelOfNat(1)]};
    t=app(t,motive); t=app(t,ofNatMinor); t=app(t,negSuccMinor); return app(t,input);
  };
  const toNat:CoreDeclaration={
    kind:"definition",name:"ProofScript.Core.P3.Int.toNat",levelParams:[],
    type:{tag:"pi",domain:int,binderInfo:"explicit",body:nat},
    value:{tag:"lam",domain:int,binderInfo:"explicit",body:rec(
      nat,
      {tag:"lam",domain:nat,binderInfo:"explicit",body:{tag:"bvar",index:0}},
      {tag:"lam",domain:nat,binderInfo:"explicit",body:c("Nat.zero")},
      {tag:"bvar",index:0},
    )},reducibility:"regular",
  };
  const natAbs:CoreDeclaration={
    kind:"definition",name:"ProofScript.Core.P3.Int.natAbs",levelParams:[],
    type:{tag:"pi",domain:int,binderInfo:"explicit",body:nat},
    value:{tag:"lam",domain:int,binderInfo:"explicit",body:rec(
      nat,
      {tag:"lam",domain:nat,binderInfo:"explicit",body:{tag:"bvar",index:0}},
      {tag:"lam",domain:nat,binderInfo:"explicit",body:app(c("Nat.succ"),{tag:"bvar",index:0})},
      {tag:"bvar",index:0},
    )},reducibility:"regular",
  };
  const natToNeg:Term=(()=>{
    const natMotive:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:int};
    const zero=app(c("Int.ofNat"),c("Nat.zero"));
    const succMinor:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:{tag:"lam",domain:int,binderInfo:"explicit",body:app(c("Int.negSucc"),{tag:"bvar",index:1})}};
    let t:Term={tag:"const",name:"Nat.rec",levels:[levelOfNat(1)]};
    t=app(t,natMotive); t=app(t,zero); t=app(t,succMinor); return app(t,{tag:"bvar",index:0});
  })();
  const neg:CoreDeclaration={
    kind:"definition",name:"ProofScript.Core.P3.Int.neg",levelParams:[],
    type:{tag:"pi",domain:int,binderInfo:"explicit",body:int},
    value:{tag:"lam",domain:int,binderInfo:"explicit",body:rec(
      int,
      {tag:"lam",domain:nat,binderInfo:"explicit",body:natToNeg},
      {tag:"lam",domain:nat,binderInfo:"explicit",body:app(c("Int.ofNat"),app(c("Nat.succ"),{tag:"bvar",index:0}))},
      {tag:"bvar",index:0},
    )},reducibility:"regular",
  };
  return [neg,toNat,natAbs];
}

function coreP3IntAddDefinitions(): CoreDeclaration[] {
  const nat=c("Nat"), int=c("Int");
  const natSub=(a:Term,b:Term)=>app(app(c(UI3_INTERNAL_NAT_SUB),a),b);
  const natAdd=(a:Term,b:Term)=>app(app(c("Nat.add"),a),b);
  const intOfNat=(n:Term)=>app(c("Int.ofNat"),n);
  const intNegSucc=(n:Term)=>app(c("Int.negSucc"),n);
  const intRec=(ofNatMinor:Term,negSuccMinor:Term,input:Term):Term=>{
    const motive:Term={tag:"lam",domain:int,binderInfo:"explicit",body:int};
    let t:Term={tag:"const",name:"Int.rec",levels:[levelOfNat(1)]};
    t=app(t,motive);t=app(t,ofNatMinor);t=app(t,negSuccMinor);return app(t,input);
  };
  const subNatNat:CoreDeclaration={
    kind:"definition",name:"ProofScript.Core.P3.Int.subNatNat",levelParams:[],
    type:{tag:"pi",domain:nat,binderInfo:"explicit",body:{tag:"pi",domain:nat,binderInfo:"explicit",body:int}},
    value:{tag:"lam",domain:nat,binderInfo:"explicit",body:{tag:"lam",domain:nat,binderInfo:"explicit",body:(()=>{
      const motive:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:int};
      const zero=intOfNat(natSub({tag:"bvar",index:1},{tag:"bvar",index:0}));
      const succMinor:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:{tag:"lam",domain:int,binderInfo:"explicit",body:intNegSucc({tag:"bvar",index:1})}};
      let t:Term={tag:"const",name:"Nat.rec",levels:[levelOfNat(1)]};
      t=app(t,motive);t=app(t,zero);t=app(t,succMinor);return app(t,natSub({tag:"bvar",index:0},{tag:"bvar",index:1}));
    })()}},reducibility:"regular",
  };
  const subCall=(m:Term,n:Term)=>app(app(c("ProofScript.Core.P3.Int.subNatNat"),m),n);
  const add:CoreDeclaration={
    kind:"definition",name:"ProofScript.Core.P3.Int.add",levelParams:[],
    type:{tag:"pi",domain:int,binderInfo:"explicit",body:{tag:"pi",domain:int,binderInfo:"explicit",body:int}},
    value:{tag:"lam",domain:int,binderInfo:"explicit",body:{tag:"lam",domain:int,binderInfo:"explicit",body:(()=>{
      // Context here is [m, n].  Each outer Int.rec minor adds the payload of m;
      // each nested minor adds the payload of n.  The explicit indices below
      // therefore mirror Lean's four logical Int.add constructor cases.
      const mOfNat:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:(()=>{
        const nOfNat:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:intOfNat(natAdd({tag:"bvar",index:1},{tag:"bvar",index:0}))};
        const nNeg:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:subCall({tag:"bvar",index:1},app(c("Nat.succ"),{tag:"bvar",index:0}))};
        return intRec(nOfNat,nNeg,{tag:"bvar",index:1});
      })()};
      const mNeg:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:(()=>{
        const nOfNat:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:subCall({tag:"bvar",index:0},app(c("Nat.succ"),{tag:"bvar",index:1}))};
        const nNeg:Term={tag:"lam",domain:nat,binderInfo:"explicit",body:intNegSucc(app(c("Nat.succ"),natAdd({tag:"bvar",index:1},{tag:"bvar",index:0})))};
        return intRec(nOfNat,nNeg,{tag:"bvar",index:1});
      })()};
      return intRec(mOfNat,mNeg,{tag:"bvar",index:1});
    })()}},reducibility:"regular",
  };
  return [subNatNat,add];
}


function leanP6CharOfNat(value: number): string {
  // Match the portable String backend and Lean Char.ofNat behavior for the
  // implemented escape slice: invalid Unicode scalar values normalize to U+0000.
  const valid = value < 0xd800 || (value > 0xdfff && value < 0x110000);
  return String.fromCodePoint(valid ? value : 0);
}

function decodeP6PortableStringLiteral(raw: string): string {
  if (raw.length < 2 || raw[0] !== '"' || raw.at(-1) !== '"') {
    throw new UnifiedBridgeUnsupported("Malformed P6 String literal in Semantic IR");
  }
  let out = "";
  for (let i = 1; i < raw.length - 1; i += 1) {
    const ch = raw[i]!;
    if (ch !== "\\") { out += ch; continue; }
    i += 1;
    if (i >= raw.length - 1) throw new UnifiedBridgeUnsupported("Incomplete P6 String escape in Semantic IR");
    const esc = raw[i]!;
    switch (esc) {
      case "\\": out += "\\"; break;
      case '"': out += '"'; break;
      case "'": out += "'"; break;
      case "n": out += "\n"; break;
      case "r": out += "\r"; break;
      case "t": out += "\t"; break;
      case "x": {
        const digits = raw.slice(i + 1, i + 3);
        if (!/^[0-9A-Fa-f]{2}$/.test(digits)) throw new UnifiedBridgeUnsupported("Malformed Lean \\xHH String escape in Semantic IR");
        out += leanP6CharOfNat(Number.parseInt(digits, 16));
        i += 2;
        break;
      }
      case "u": {
        const digits = raw.slice(i + 1, i + 5);
        if (!/^[0-9A-Fa-f]{4}$/.test(digits)) throw new UnifiedBridgeUnsupported("Malformed Lean \\uHHHH String escape in Semantic IR");
        out += leanP6CharOfNat(Number.parseInt(digits, 16));
        i += 4;
        break;
      }
      default:
        throw new UnifiedBridgeUnsupported(`Unsupported P6 String escape '\\${esc}' in Semantic IR`);
    }
  }
  return out;
}

function p6Utf8ByteSizeOfDecodedString(value: string): number {
  let bytes = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function p6IsNatDecodedString(value: string): boolean {
  return value.length > 0 && Array.from(value).every((ch) => ch >= "0" && ch <= "9");
}

function stringConstructorNameFromDecodedValue(context: LoweringContext, canonicalValue: string): string {
  const existing = context.stringLiterals.get(canonicalValue);
  if (existing) return existing;
  const digest = crypto.createHash("sha256").update(canonicalValue).digest("hex").slice(0, 16);
  const name = `ProofScript.Core.P6.String.lit_${digest}`;
  context.stringLiterals.set(canonicalValue, name);
  return name;
}

function stringConstructorName(context: LoweringContext, raw: string): string {
  return stringConstructorNameFromDecodedValue(context, decodeP6PortableStringLiteral(raw));
}

function foldP6LiteralStringValue(expr: IRExpr, feature: string): string {
  if (expr.kind === "literal" && expr.op === "core.string.literal" && isStringType(expr.type)) return decodeP6PortableStringLiteral(expr.value);
  if (expr.kind === "op" && expr.op === "core.string.append.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringValue(expr.args[0]!, feature) + foldP6LiteralStringValue(expr.args[1]!, feature);
  }
  if (expr.kind === "op" && expr.op === "core.string.take.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringTake(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.drop.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringDrop(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.takeRight.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringTakeRight(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.dropRight.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringDropRight(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.stripPrefix.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringStripPrefix(expr.args[0]!, expr.args[1]!);
  }
  if (expr.kind === "op" && expr.op === "core.string.stripSuffix.literal" && expr.args.length === 2 && isStringType(expr.type)) {
    return foldP6LiteralStringStripSuffix(expr.args[0]!, expr.args[1]!);
  }
  throw new UnifiedBridgeUnsupported(`Production P6 integrates only literal-only ${feature}`);
}

function foldP6LiteralNatValue(expr: IRExpr, feature: string): bigint {
  if (expr.kind === "literal" && expr.op === "core.nat.literal" && expr.type.id === "Nat") return BigInt(expr.value);
  if (expr.kind === "op" && expr.op === "core.string.length.literal" && expr.args.length === 1 && expr.type.id === "Nat") {
    return BigInt(Array.from(foldP6LiteralStringValue(expr.args[0]!, "String.length")).length);
  }
  if (expr.kind === "op" && expr.op === "core.string.utf8ByteSize.literal" && expr.args.length === 1 && expr.type.id === "Nat") {
    return BigInt(p6Utf8ByteSizeOfDecodedString(foldP6LiteralStringValue(expr.args[0]!, "String.utf8ByteSize")));
  }
  throw new UnifiedBridgeUnsupported(`Production P6 integrates only literal-only Nat count for ${feature}`);
}

function foldP6LiteralStringTake(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(foldP6LiteralStringValue(subject, "String.take"));
  const n = foldP6LiteralNatValue(count, "String.take");
  return n >= BigInt(chars.length) ? chars.join("") : chars.slice(0, Number(n)).join("");
}

function foldP6LiteralStringDrop(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(foldP6LiteralStringValue(subject, "String.drop"));
  const n = foldP6LiteralNatValue(count, "String.drop");
  return n >= BigInt(chars.length) ? "" : chars.slice(Number(n)).join("");
}

function foldP6LiteralStringTakeRight(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(foldP6LiteralStringValue(subject, "String.takeRight"));
  const n = foldP6LiteralNatValue(count, "String.takeRight");
  return n >= BigInt(chars.length) ? chars.join("") : chars.slice(chars.length - Number(n)).join("");
}

function foldP6LiteralStringDropRight(subject: IRExpr, count: IRExpr): string {
  const chars = Array.from(foldP6LiteralStringValue(subject, "String.dropRight"));
  const n = foldP6LiteralNatValue(count, "String.dropRight");
  return n >= BigInt(chars.length) ? "" : chars.slice(0, chars.length - Number(n)).join("");
}

function foldP6LiteralStringStripPrefix(subject: IRExpr, prefix: IRExpr): string {
  const value = foldP6LiteralStringValue(subject, "String.stripPrefix");
  const prefixValue = foldP6LiteralStringValue(prefix, "String.stripPrefix");
  return value.startsWith(prefixValue) ? value.slice(prefixValue.length) : value;
}

function foldP6LiteralStringStripSuffix(subject: IRExpr, suffix: IRExpr): string {
  const value = foldP6LiteralStringValue(subject, "String.stripSuffix");
  const suffixValue = foldP6LiteralStringValue(suffix, "String.stripSuffix");
  return value.endsWith(suffixValue) ? value.slice(0, value.length - suffixValue.length) : value;
}

function coreP6StringDeclaration(context: LoweringContext): CoreDeclaration {
  if (context.stringLiterals.size === 0) {
    throw new UnifiedBridgeUnsupported("P6 String library requested without any checked string literals");
  }
  const type0: Term = { tag: "sort", level: levelOfNat(1) };
  const stringType = c("ProofScript.Core.P6.String");
  const constructors = [...context.stringLiterals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, name]) => ({ name, type: stringType }));
  return { kind: "inductive", name: "ProofScript.Core.P6.String", levelParams: [], type: type0, numParams: 0, numIndices: 0, constructors };
}


function coreP6StringBeqDefinition(context: LoweringContext): CoreDeclaration {
  if (context.stringLiterals.size === 0) {
    throw new UnifiedBridgeUnsupported("P6 String.beq requested without any checked string literals");
  }
  const stringType = c("ProofScript.Core.P6.String");
  const bool = c("Bool");
  const constructors = [...context.stringLiterals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, name]) => name);
  const recConst: Term = { tag: "const", name: "ProofScript.Core.P6.String.rec", levels: [levelOfNat(1)] };
  const boolMotive: Term = { tag: "lam", domain: stringType, binderInfo: "explicit", body: bool };
  function boolFor(value: boolean): Term { return c(value ? "Bool.true" : "Bool.false"); }
  function innerRow(rowIndex: number): Term {
    let rec: Term = recConst;
    rec = app(rec, boolMotive);
    for (let col = 0; col < constructors.length; col += 1) rec = app(rec, boolFor(rowIndex === col));
    return app(rec, { tag: "bvar", index: 0 });
  }
  const stringToBool: Term = { tag: "pi", domain: stringType, binderInfo: "explicit", body: bool };
  const outerMotive: Term = { tag: "lam", domain: stringType, binderInfo: "explicit", body: stringToBool };
  let outer: Term = recConst;
  outer = app(outer, outerMotive);
  for (let row = 0; row < constructors.length; row += 1) {
    outer = app(outer, { tag: "lam", domain: stringType, binderInfo: "explicit", body: innerRow(row) });
  }
  const body = app(outer, { tag: "bvar", index: 0 });
  return {
    kind: "definition",
    name: "ProofScript.Core.P6.String.beq",
    levelParams: [],
    type: { tag: "pi", domain: stringType, binderInfo: "explicit", body: { tag: "pi", domain: stringType, binderInfo: "explicit", body: bool } },
    value: { tag: "lam", domain: stringType, binderInfo: "explicit", body },
    reducibility: "regular",
  };
}

function coreP3OptionDeclaration(): CoreDeclaration {
  const type0: Term = {tag:"sort", level:levelOfNat(1)};
  const a: Term = {tag:"bvar", index:0};
  const optionA = app(c("ProofScript.Core.P3.Option"), a);
  const optionAUnderValue = app(c("ProofScript.Core.P3.Option"), {tag:"bvar", index:1});
  return {
    kind:"inductive", name:"ProofScript.Core.P3.Option", levelParams:[],
    type:{tag:"pi",domain:type0,body:type0,binderInfo:"implicit"},
    numParams:1, numIndices:0,
    constructors:[
      {name:"ProofScript.Core.P3.Option.none",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:optionA}},
      {name:"ProofScript.Core.P3.Option.some",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:a,binderInfo:"explicit",body:optionAUnderValue}}},
    ],
  };
}

function optionInnerType(type: IRType): IRType {
  const arg=type.args?.[0];
  if(type.form!=="nominal" || type.family!=="core.option" || !arg || arg.kind!=="type") throw new UnifiedBridgeUnsupported(`P3 malformed Option type '${type.displayName}'`);
  return arg.value;
}

function lowerP3OptionMatch(expr: IRExpr & {kind:"extension"}, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  context.requiresOption=true;
  const payload=expr.payload as {cases?: readonly {variant:string; binders:readonly string[]}[]};
  const [scrutinee,...bodies]=expr.args;
  if(!scrutinee || !payload?.cases) throw new UnifiedBridgeUnsupported("P3 malformed Option match");
  const inner=optionInnerType(scrutinee.type);
  const someIndex=payload.cases.findIndex(x=>x.variant==="some");
  const noneIndex=payload.cases.findIndex(x=>x.variant==="none");
  if(someIndex<0 || noneIndex<0) throw new UnifiedBridgeUnsupported("P3 Option match requires some/none cases");
  const someBinder=payload.cases[someIndex]!.binders[0];
  if(!someBinder || payload.cases[someIndex]!.binders.length!==1 || payload.cases[noneIndex]!.binders.length!==0) throw new UnifiedBridgeUnsupported("P3 malformed Option branch binders");
  const resultType=lowerType(expr.type,locals,globals,context);
  const innerCore=lowerType(inner,locals,globals,context);
  const optionCore=app(c("ProofScript.Core.P3.Option"),innerCore);
  const motive:Term={tag:"lam",domain:optionCore,body:liftTerm(resultType),binderInfo:"explicit"};
  const noneBody=lowerExpr(bodies[noneIndex]!,locals,globals,context);
  const someBody=lowerExpr(bodies[someIndex]!,[...locals,someBinder],globals,context);
  const someMinor:Term={tag:"lam",domain:innerCore,body:someBody,binderInfo:"explicit"};
  let rec:Term={tag:"const",name:"ProofScript.Core.P3.Option.rec",levels:[universeForType(expr.type)]};
  rec=app(rec,innerCore); rec=app(rec,motive); rec=app(rec,noneBody); rec=app(rec,someMinor); rec=app(rec,lowerExpr(scrutinee,locals,globals,context));
  return rec;
}


function coreP3ListDeclaration(): CoreDeclaration {
  const type0:Term={tag:"sort",level:levelOfNat(1)};
  const a0:Term={tag:"bvar",index:0};
  const list=(a:Term):Term=>app(c("ProofScript.Core.P3.List"),a);
  return {
    kind:"inductive",name:"ProofScript.Core.P3.List",levelParams:[],
    type:{tag:"pi",domain:type0,body:type0,binderInfo:"implicit"},numParams:1,numIndices:0,
    constructors:[
      {name:"ProofScript.Core.P3.List.nil",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:list(a0)}},
      {name:"ProofScript.Core.P3.List.cons",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:a0,binderInfo:"explicit",body:{tag:"pi",domain:list({tag:"bvar",index:1}),binderInfo:"explicit",body:list({tag:"bvar",index:2})}}}},
    ],
  };
}

function listInnerType(type:IRType):IRType {
  const arg=type.args?.[0];
  if(type.form!=="nominal" || type.family!=="core.list" || !arg || arg.kind!=="type") throw new UnifiedBridgeUnsupported(`P3 malformed List type '${type.displayName}'`);
  return arg.value;
}

function lowerP3ListMatch(expr:IRExpr & {kind:"extension"},locals:readonly string[],globals:ReadonlySet<string>,context:LoweringContext):Term {
  context.requiresList=true;
  const payload=expr.payload as {cases?:readonly {variant:string;binders:readonly string[]}[]};
  const [scrutinee,...bodies]=expr.args;
  if(!scrutinee || !payload?.cases) throw new UnifiedBridgeUnsupported("P3 malformed List match");
  const inner=listInnerType(scrutinee.type);
  const nilIndex=payload.cases.findIndex(x=>x.variant==="nil"),consIndex=payload.cases.findIndex(x=>x.variant==="cons");
  if(nilIndex<0||consIndex<0) throw new UnifiedBridgeUnsupported("P3 List match requires nil/cons cases");
  const consBinders=[...payload.cases[consIndex]!.binders];
  if(consBinders.length!==2 || payload.cases[nilIndex]!.binders.length!==0) throw new UnifiedBridgeUnsupported("P3 malformed List branch binders");
  const [headName,tailName]=consBinders as [string,string];
  const innerCore=lowerType(inner,locals,globals,context);
  const listCore=app(c("ProofScript.Core.P3.List"),innerCore);
  const resultType=lowerType(expr.type,locals,globals,context);
  const motive:Term={tag:"lam",domain:listCore,body:liftTerm(resultType),binderInfo:"explicit"};
  let rec:Term={tag:"const",name:"ProofScript.Core.P3.List.rec",levels:[universeForType(expr.type)]};
  rec=app(rec,innerCore); rec=app(rec,motive);
  rec=app(rec,lowerExpr(bodies[nilIndex]!,locals,globals,context));
  const ihName="__p3_list_ih";
  const previousIH=context.recursive?.branchIHByField;
  if(context.recursive && scrutinee.kind==="var" && scrutinee.name===context.recursive.structuralParam) context.recursive.branchIHByField=new Map([[tailName,ihName]]);
  let consBody=lowerExpr(bodies[consIndex]!,[...locals,headName,tailName,ihName],globals,context);
  if(context.recursive) context.recursive.branchIHByField=previousIH;
  consBody={tag:"lam",domain:lowerType(expr.type,[...locals,headName,tailName],globals,context),body:consBody,binderInfo:"explicit"};
  consBody={tag:"lam",domain:lowerType(scrutinee.type,[...locals,headName],globals,context),body:consBody,binderInfo:"explicit"};
  consBody={tag:"lam",domain:lowerType(inner,locals,globals,context),body:consBody,binderInfo:"explicit"};
  rec=app(rec,consBody);
  return app(rec,lowerExpr(scrutinee,locals,globals,context));
}

function coreP3ExceptDeclaration(): CoreDeclaration {
  const type0:Term={tag:"sort",level:levelOfNat(1)};
  const exceptEA=(e:Term,a:Term):Term=>app(app(c("ProofScript.Core.P3.Except"),e),a);
  return {
    kind:"inductive",name:"ProofScript.Core.P3.Except",levelParams:[],
    type:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:type0,binderInfo:"implicit",body:type0}},
    numParams:2,numIndices:0,
    constructors:[
      {name:"ProofScript.Core.P3.Except.error",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:{tag:"bvar",index:1},binderInfo:"explicit",body:exceptEA({tag:"bvar",index:2},{tag:"bvar",index:1})}}}},
      {name:"ProofScript.Core.P3.Except.ok",type:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:type0,binderInfo:"implicit",body:{tag:"pi",domain:{tag:"bvar",index:0},binderInfo:"explicit",body:exceptEA({tag:"bvar",index:2},{tag:"bvar",index:1})}}}},
    ],
  };
}

function exceptInnerTypes(type:IRType):readonly [IRType,IRType]{
  const e=type.args?.[0],a=type.args?.[1];
  if(type.form!=="nominal"||type.family!=="core.except"||!e||e.kind!=="type"||!a||a.kind!=="type") throw new UnifiedBridgeUnsupported(`P3 malformed Except type '${type.displayName}'`);
  return [e.value,a.value];
}

function lowerP3ExceptMatch(expr:IRExpr & {kind:"extension"},locals:readonly string[],globals:ReadonlySet<string>,context:LoweringContext):Term{
  context.requiresExcept=true;
  const payload=expr.payload as {cases?:readonly {variant:string;binders:readonly string[]}[]};
  const [scrutinee,...bodies]=expr.args;
  if(!scrutinee||!payload?.cases) throw new UnifiedBridgeUnsupported("P3 malformed Except match");
  const [errorType,valueType]=exceptInnerTypes(scrutinee.type);
  const errorIndex=payload.cases.findIndex(x=>x.variant==="error"),okIndex=payload.cases.findIndex(x=>x.variant==="ok");
  if(errorIndex<0||okIndex<0) throw new UnifiedBridgeUnsupported("P3 Except match requires error/ok cases");
  const errorBinder=payload.cases[errorIndex]!.binders[0],okBinder=payload.cases[okIndex]!.binders[0];
  if(!errorBinder||!okBinder||payload.cases[errorIndex]!.binders.length!==1||payload.cases[okIndex]!.binders.length!==1) throw new UnifiedBridgeUnsupported("P3 malformed Except branch binders");
  const eCore=lowerType(errorType,locals,globals,context),aCore=lowerType(valueType,locals,globals,context);
  const resultType=lowerType(expr.type,locals,globals,context);
  const exceptCore=app(app(c("ProofScript.Core.P3.Except"),eCore),aCore);
  const motive:Term={tag:"lam",domain:exceptCore,binderInfo:"explicit",body:liftTerm(resultType)};
  const errorBody=lowerExpr(bodies[errorIndex]!,[...locals,errorBinder],globals,context);
  const okBody=lowerExpr(bodies[okIndex]!,[...locals,okBinder],globals,context);
  const errorMinor:Term={tag:"lam",domain:eCore,binderInfo:"explicit",body:errorBody};
  const okMinor:Term={tag:"lam",domain:aCore,binderInfo:"explicit",body:okBody};
  let rec:Term={tag:"const",name:"ProofScript.Core.P3.Except.rec",levels:[universeForType(expr.type)]};
  rec=app(rec,eCore);rec=app(rec,aCore);rec=app(rec,motive);rec=app(rec,errorMinor);rec=app(rec,okMinor);rec=app(rec,lowerExpr(scrutinee,locals,globals,context));
  return rec;
}

function lowerLocalBinderType(type: IRType, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  if (type.form === "term" && type.term) return lowerExpr(type.term, locals, globals, context);
  return lowerType(type, locals, globals, context);
}

function lowerExpr(expr: IRExpr, locals: readonly string[], globals: ReadonlySet<string>, context: LoweringContext): Term {
  switch (expr.kind) {
    case "type":
      return lowerType(expr.value, locals, globals, context);
    case "literal":
      if (expr.op === "core.nat.literal" && expr.type.id === "Nat") return natLiteral(expr.value);
      if (expr.op === "core.int.literal" && expr.type.id === "Int") { context.requiresInt=true; return app(c("Int.ofNat"),natLiteral(expr.value)); }
      if (expr.op === "core.string.literal" && expr.type.id === "String") { context.requiresString=true; return c(stringConstructorName(context, expr.value)); }
      throw new UnifiedBridgeUnsupported(`P3 literal operation '${expr.op}' is unsupported`);
    case "var":
      if (expr.name === "__psInstAddNat") { context.requiresAdd = true; return coreWaveGNatAddDictionary(); }
      if (expr.name === "__psInstAddInt") { context.requiresAdd = true; context.requiresInt = true; context.requiresIntAdd = true; return app(app(c(WAVEG_ADD_MK),c("Int")),c("ProofScript.Core.P3.Int.add")); }
      return lowerVar(expr.name, locals, globals);
    case "lambda": {
      const names = expr.params.map(p => p.name);
      let body = lowerExpr(expr.body, [...locals, ...names], globals, context);
      for (let i = expr.params.length - 1; i >= 0; i--) {
        const param = expr.params[i]!;
        const domain = lowerType(param.type, [...locals, ...names.slice(0, i)], globals, context);
        body = { tag: "lam", domain, body, binderInfo: lowerBinderInfo(param.binderInfo) };
      }
      return body;
    }
    case "apply": {
      let term=lowerExpr(expr.callee,locals,globals,context);
      for(const arg of expr.args) term=app(term,lowerExpr(arg,locals,globals,context));
      return term;
    }
    case "call": {
      const checkedArgs = expr.checkedArgs ?? expr.args;
      if (context.recursive && expr.callee === context.recursive.defName && context.recursive.branchIHByField) {
        // Runtime args retain the branch-local pattern binder identities.
        // checkedArgs may preserve source-level names for erased dependent
        // arguments, so it is not the right source for structural-IH lookup.
        //
        // The recursor is built inside the lambdas for all non-structural
        // parameters, so its IH already closes over those unchanged outer
        // values.  We can therefore support practical definitions such as
        // append(xs, ys) by replacing append(tail, ys) with the IH, while
        // still failing closed if any non-structural runtime argument changes.
        const runtimeArgs = expr.args.filter(arg => arg.kind !== "type");
        const runtimeParamNames=context.recursive.runtimeParamNames;
        if (runtimeArgs.length !== runtimeParamNames.length) {
          throw new UnifiedBridgeUnsupported(`Production P1 recursive call '${expr.callee}' has unsupported runtime arity`);
        }
        const structuralIndex=runtimeParamNames.indexOf(context.recursive.structuralParam);
        if(structuralIndex<0) throw new UnifiedBridgeUnsupported(`Production P1 recursive frame for '${expr.callee}' lost its structural parameter`);
        const structuralArg=runtimeArgs[structuralIndex];
        if(structuralArg?.kind!=="var") {
          throw new UnifiedBridgeUnsupported(`Production P1 recursive call '${expr.callee}' must recurse directly on one constructor field`);
        }
        const ihName=context.recursive.branchIHByField.get(structuralArg.name);
        if(!ihName) {
          throw new UnifiedBridgeUnsupported(`Production P1 recursive call '${expr.callee}' is not on a structurally smaller constructor field`);
        }
        for(let i=0;i<runtimeArgs.length;i++){
          if(i===structuralIndex) continue;
          const arg=runtimeArgs[i];
          if(arg?.kind!=="var" || arg.name!==runtimeParamNames[i]) {
            throw new UnifiedBridgeUnsupported(`Production P1 recursive call '${expr.callee}' must preserve non-structural parameter '${runtimeParamNames[i]}'`);
          }
        }
        return lowerVar(ihName, locals, globals);
      }
      if (expr.callee === "__psInstHAdd") {
        const [typeArg, baseDictionary] = checkedArgs;
        if (!typeArg || typeArg.kind !== "type" || !baseDictionary) {
          throw new UnifiedBridgeUnsupported("Wave G malformed HAdd-from-Add dictionary construction");
        }
        context.requiresAdd = true;
        context.requiresHAdd = true;
        const carrier = lowerType(typeArg.value, locals, globals, context);
        const addDictionary = lowerExpr(baseDictionary, locals, globals, context);
        return coreWaveGHAddFromAdd(carrier, addDictionary);
      }
      if (["__psDecidableEqNat", "__psDecidableLENat", "__psDecidableLTNat"].includes(expr.callee)) {
        if (checkedArgs.length !== 2 || !checkedArgs.every(arg => isNatType(arg.type))) {
          throw new UnifiedBridgeUnsupported(`Wave E malformed canonical Nat decision evidence '${expr.callee}'`);
        }
        context.requiresDecidable = true;
        const fn = expr.callee === "__psDecidableEqNat" ? WAVEB_NAT_DEC_EQ : expr.callee === "__psDecidableLENat" ? WAVEB_NAT_DEC_LE : WAVEB_NAT_DEC_LT;
        let term: Term = c(fn);
        for (const arg of checkedArgs) term = app(term, lowerExpr(arg, locals, globals, context));
        return term;
      }
      let term: Term = lowerVar(expr.callee, locals, globals);
      for (const arg of checkedArgs) term = { tag: "app", fn: term, arg: lowerExpr(arg, locals, globals, context) };
      return term;
    }
    case "op": {
      if (expr.op === "lean.class.project") return lowerP2ClassProject(expr, locals, globals, context);
      if (expr.op === "lean.inductive.construct") return lowerP1InductiveConstruct(expr, locals, globals, context);
      if (expr.op === "lean.structure.construct") return lowerP1StructureConstruct(expr, locals, globals, context);
      if (expr.op === "lean.structure.project") return lowerP1StructureProject(expr, locals, globals, context);
      if (expr.op === "lean.structure.update") return lowerP1StructureUpdate(expr, locals, globals, context);
      if (expr.op === "lean.structure.parentProject") throw new UnifiedBridgeUnsupported("Production P1 structure inheritance is not integrated yet");
      const lowered = coreOperationLowerings.lower(expr.op, expr, { locals, globals, context });
      if (lowered) return lowered;
      throw new UnifiedBridgeUnsupported(`Wave A operation '${expr.op}' is unsupported`);
    }
    case "extension": {
      if (expr.op === "lean.inductive.match") return lowerP1InductiveMatch(expr, locals, globals, context);
      if (expr.op === "core.option.match") return lowerP3OptionMatch(expr, locals, globals, context);
      if (expr.op === "core.list.match") return lowerP3ListMatch(expr, locals, globals, context);
      if (expr.op === "core.except.match") return lowerP3ExceptMatch(expr,locals,globals,context);
      if (expr.op === "core.option.some") { context.requiresOption=true; const inner=optionInnerType(expr.type); let t:Term=c("ProofScript.Core.P3.Option.some"); t=app(t,lowerType(inner,locals,globals,context)); return app(t,lowerExpr(expr.args[0]!,locals,globals,context)); }
      if (expr.op === "core.option.none") { context.requiresOption=true; const inner=optionInnerType(expr.type); return app(c("ProofScript.Core.P3.Option.none"),lowerType(inner,locals,globals,context)); }
      if (expr.op === "core.list.nil") { context.requiresList=true; const inner=listInnerType(expr.type); return app(c("ProofScript.Core.P3.List.nil"),lowerType(inner,locals,globals,context)); }
      if (expr.op === "core.list.cons") { context.requiresList=true; const inner=listInnerType(expr.type); let t:Term=app(c("ProofScript.Core.P3.List.cons"),lowerType(inner,locals,globals,context)); t=app(t,lowerExpr(expr.args[0]!,locals,globals,context)); return app(t,lowerExpr(expr.args[1]!,locals,globals,context)); }
      if (expr.op === "core.except.ok") { context.requiresExcept=true; const [e,a]=exceptInnerTypes(expr.type); let t:Term=c("ProofScript.Core.P3.Except.ok"); t=app(t,lowerType(e,locals,globals,context));t=app(t,lowerType(a,locals,globals,context));return app(t,lowerExpr(expr.args[0]!,locals,globals,context)); }
      if (expr.op === "core.except.error") { context.requiresExcept=true; const [e,a]=exceptInnerTypes(expr.type); let t:Term=c("ProofScript.Core.P3.Except.error"); t=app(t,lowerType(e,locals,globals,context));t=app(t,lowerType(a,locals,globals,context));return app(t,lowerExpr(expr.args[0]!,locals,globals,context)); }
      if (expr.op === "core.bool.literal") {
        const value=(expr.payload as { value?: string } | undefined)?.value;
        if(value === "true") return c("Bool.true");
        if(value === "false") return c("Bool.false");
        throw new UnifiedBridgeUnsupported("UI4 malformed Bool literal payload");
      }
      if (expr.op === "lean.bif" && expr.args.length === 3) {
        const [condition, thenBranch, elseBranch]=expr.args;
        if(!condition || !thenBranch || !elseBranch) throw new UnifiedBridgeUnsupported("UI4 malformed bif");
        const resultType=lowerType(expr.type,locals,globals,context);
        const motive:Term={tag:"lam",domain:c("Bool"),body:resultType,binderInfo:"explicit"};
        const rec:Term={tag:"const",name:"Bool.rec",levels:[universeForType(expr.type)]};
        return app(app(app(app(rec,motive),lowerExpr(elseBranch,locals,globals,context)),lowerExpr(thenBranch,locals,globals,context)),lowerExpr(condition,locals,globals,context));
      }
      if (expr.op === "core.local.let" && expr.args.length === 2) {
        const payload=expr.payload as { name?: string; binderType?: IRType } | undefined;
        const name=payload?.name;
        const binderType=payload?.binderType;
        if(!name || !binderType) throw new UnifiedBridgeUnsupported("UI4 malformed local let payload");
        return {
          tag:"let",
          type:lowerLocalBinderType(binderType,locals,globals,context),
          value:lowerExpr(expr.args[0]!,locals,globals,context),
          body:lowerExpr(expr.args[1]!,[...locals,name],globals,context),
          nondep:false,
        };
      }
      if (expr.op === "lean.if" && expr.args.length >= 3) {
        const payload = expr.payload as { form?: string; decision?: string; binderName?: string } | undefined;
        const [condition, thenBranch, elseBranch, frontendEvidence] = expr.args;
        if (!condition || !thenBranch || !elseBranch) throw new UnifiedBridgeUnsupported("Wave C malformed proposition if");
        const proposition = lowerExpr(condition, locals, globals, context);
        const decisionEvidence = lowerDecidableEvidence(condition, frontendEvidence, locals, globals, context);
        const resultType = lowerType(expr.type, locals, globals, context);
        const decidableType = app(c(WAVEB_DECIDABLE), proposition);
        const notType = app(c("Not"), proposition);
        const motive: Term = { tag: "lam", domain: decidableType, body: liftTerm(resultType), binderInfo: "explicit" };
        const branchLocals = payload?.binderName ? [...locals, payload.binderName] : locals;
        const falseBody = lowerExpr(elseBranch, branchLocals, globals, context);
        const trueBody = lowerExpr(thenBranch, branchLocals, globals, context);
        const onFalse: Term = { tag: "lam", domain: notType, body: payload?.binderName ? falseBody : liftTerm(falseBody), binderInfo: "explicit" };
        const onTrue: Term = { tag: "lam", domain: proposition, body: payload?.binderName ? trueBody : liftTerm(trueBody), binderInfo: "explicit" };
        const rec: Term = { tag: "const", name: "Decidable.rec", levels: [universeForType(expr.type)] };
        return app(app(app(app(app(rec, proposition), motive), onFalse), onTrue), decisionEvidence);
      }
      throw new UnifiedBridgeUnsupported(`UI4 extension '${expr.op}' is unsupported`);
    }
    default:
      throw new UnifiedBridgeUnsupported(`UI4 expression '${expr.kind}' is unsupported`);
  }
}



interface OperationLoweringEnvironment {
  readonly locals: readonly string[];
  readonly globals: ReadonlySet<string>;
  readonly context: LoweringContext;
}

const coreOperationLowerings = new CoreLoweringRegistry<IRExpr & { kind: "op" }, OperationLoweringEnvironment, Term>();

coreOperationLowerings.register({
  semanticId: "lean.int.ofNat", feature: "Int.ofNat", trust: "checked-core-library", status: "unified",
  notes: "Production P3 lowers to the checked canonical Int.ofNat constructor of the mirrored Lean Int inductive.",
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P3 malformed Int.ofNat");
  env.context.requiresInt = true;
  return app(c("Int.ofNat"), lowerExpr(expr.args[0]!, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "lean.int.negSucc", feature: "Int.negSucc", trust: "checked-core-library", status: "unified",
  notes: "Production P3 lowers to the checked canonical Int.negSucc constructor.",
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P3 malformed Int.negSucc");
  env.context.requiresInt = true;
  return app(c("Int.negSucc"), lowerExpr(expr.args[0]!, env.locals, env.globals, env.context));
});

for (const [semanticId, coreName, feature] of [
  ["lean.int.neg", "ProofScript.Core.P3.Int.neg", "Int.neg"],
  ["lean.int.toNat", "ProofScript.Core.P3.Int.toNat", "Int.toNat"],
  ["lean.int.natAbs", "ProofScript.Core.P3.Int.natAbs", "Int.natAbs"],
] as const) {
  coreOperationLowerings.register({
    semanticId, feature, trust: "checked-core-library", status: "unified",
    notes: `Production P3 lowers ${feature} to an independently kernel-checked recursor definition.`,
  }, (expr, env) => {
    if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported(`P3 malformed ${feature}`);
    env.context.requiresInt = true;
    return app(c(coreName), lowerExpr(expr.args[0]!, env.locals, env.globals, env.context));
  });
}

coreOperationLowerings.register({
  semanticId: "lean.not", feature: "internal named-if false proof proposition", trust: "checked-core-proposition", status: "partial",
  notes: "Wave C lowers the frontend's internal Not p type exactly to the checked WaveB Not definition; it is not yet a general source-visible Not migration.",
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("Wave C malformed internal Not proposition");
  env.context.requiresDecidable = true;
  return app(c("Not"), lowerExpr(expr.args[0]!, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "core.nat.add", feature: "Nat.add", trust: "kernel-primitive", status: "unified",
  notes: "Directly lowers to default Core v71 K3-TB Nat.add.",
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("Wave A malformed Nat.add");
  return app(app(c("Nat.add"), lowerExpr(expr.args[0]!, env.locals, env.globals, env.context)), lowerExpr(expr.args[1]!, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "lean.hAdd", feature: "generic Type-0 HAdd dictionary application", trust: "checked-core-library", status: "partial",
  notes: "Wave G preserves WaveF checked HAdd projection transport and constructs HAdd(A,A,A) from an explicit checked Add(A) dictionary via checked Add.add; broader HAdd remains partial.",
}, (expr, env) => {
  if (expr.args.length !== 3) throw new UnifiedBridgeUnsupported("Wave F malformed HAdd application");
  const [dictionary, left, right] = expr.args;
  if (!dictionary || !left || !right || dictionary.type.form !== "nominal" || dictionary.type.family !== "lean.class:HAdd" || dictionary.type.args?.length !== 3 || !dictionary.type.args.every(arg => arg.kind === "type")) {
    throw new UnifiedBridgeUnsupported("Wave F generic addition requires an explicit HAdd(A,B,C) dictionary value");
  }
  const [aArg,bArg,cArg] = dictionary.type.args;
  if (!aArg || !bArg || !cArg || aArg.kind !== "type" || bArg.kind !== "type" || cArg.kind !== "type") {
    throw new UnifiedBridgeUnsupported("Wave F malformed HAdd type arguments");
  }
  env.context.requiresHAdd = true;
  let term: Term = c(WAVEF_HADD_FIELD);
  for (const typeArg of [aArg.value,bArg.value,cArg.value]) term = app(term, lowerType(typeArg, env.locals, env.globals, env.context));
  term = app(term, lowerExpr(dictionary, env.locals, env.globals, env.context));
  term = app(term, lowerExpr(left, env.locals, env.globals, env.context));
  return app(term, lowerExpr(right, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "lean.hMul", feature: "canonical HMul Nat Nat Nat", trust: "checked-core-library", status: "partial",
  notes: "Only the canonical Nat dictionary path is unified; generic/custom HMul remains fail-closed.",
}, (expr, env) => {
  if (expr.args.length !== 3) throw new UnifiedBridgeUnsupported("Wave A malformed HMul");
  const [dictionary, left, right] = expr.args;
  if (!dictionary || !left || !right || !isNatType(expr.type) || !isNatType(left.type) || !isNatType(right.type) || !isCanonicalNatHMulDictionary(dictionary)) {
    throw new UnifiedBridgeUnsupported("Wave A integrates only the canonical HMul Nat Nat Nat dictionary path");
  }
  env.context.requiresNatMul = true;
  return app(app(c(UI2_INTERNAL_NAT_MUL), lowerExpr(left, env.locals, env.globals, env.context)), lowerExpr(right, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "lean.hSub", feature: "canonical HSub Nat Nat Nat", trust: "checked-core-library", status: "partial",
  notes: "Only the canonical Nat dictionary path is unified; generic/custom HSub remains fail-closed.",
}, (expr, env) => {
  if (expr.args.length !== 3) throw new UnifiedBridgeUnsupported("Wave A malformed HSub");
  const [dictionary, left, right] = expr.args;
  if (!dictionary || !left || !right || !isNatType(expr.type) || !isNatType(left.type) || !isNatType(right.type) || !isCanonicalNatHSubDictionary(dictionary)) {
    throw new UnifiedBridgeUnsupported("Wave A integrates only the canonical HSub Nat Nat Nat dictionary path");
  }
  env.context.requiresNatSub = true;
  return app(app(c(UI3_INTERNAL_NAT_SUB), lowerExpr(left, env.locals, env.globals, env.context)), lowerExpr(right, env.locals, env.globals, env.context));
});

for (const spec of [
  { semanticId: "lean.le", className: "LE" as const, coreName: UI4_NAT_LE },
  { semanticId: "lean.lt", className: "LT" as const, coreName: UI4_NAT_LT },
]) coreOperationLowerings.register({
  semanticId: spec.semanticId, feature: `canonical ${spec.className} Nat`, trust: "checked-core-proposition", status: "partial",
  notes: `Only the canonical ${spec.className} Nat dictionary lowers to the checked exact Nat proposition.`,
}, (expr, env) => {
  if (expr.args.length !== 3) throw new UnifiedBridgeUnsupported(`Wave A malformed ${spec.className}`);
  const [dictionary, left, right] = expr.args;
  if (!dictionary || !left || !right || !isNatType(left.type) || !isNatType(right.type) || !isCanonicalNatOrderDictionary(dictionary, spec.className)) {
    throw new UnifiedBridgeUnsupported(`Wave A integrates only the canonical ${spec.className} Nat dictionary path`);
  }
  env.context.requiresNatOrder = true;
  return app(app(c(spec.coreName), lowerExpr(left, env.locals, env.globals, env.context)), lowerExpr(right, env.locals, env.globals, env.context));
});

coreOperationLowerings.register({
  semanticId: "proof.eq", feature: "Eq", trust: "kernel-primitive", status: "unified",
  notes: "Lowers to frozen Core Eq for currently lowerable carriers.",
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("Wave A malformed equality");
  const left = expr.args[0]!, right = expr.args[1]!;
  const carrier = lowerType(left.type, env.locals, env.globals, env.context);
  const eqConst: Term = { tag: "const", name: "Eq", levels: [universeForType(left.type)] };
  return app(app(app(eqConst, carrier), lowerExpr(left, env.locals, env.globals, env.context)), lowerExpr(right, env.locals, env.globals, env.context));
});



coreOperationLowerings.register({
  semanticId: "core.string.append.literal", feature: "literal-only String.append", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.append only when both operands fold to decoded portable literals, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.append expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringValue(expr, "String.append")));
});

coreOperationLowerings.register({
  semanticId: "core.string.take.literal", feature: "literal-only String.take", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.take only when the subject folds to a decoded portable literal and the count folds to a Nat literal, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.take expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringTake(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.drop.literal", feature: "literal-only String.drop", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.drop only when the subject folds to a decoded portable literal and the count folds to a Nat literal, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.drop expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringDrop(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.takeRight.literal", feature: "literal-only String.takeRight", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.takeRight only when the subject folds to a decoded portable literal and the count folds to a Nat literal, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.takeRight expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringTakeRight(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.dropRight.literal", feature: "literal-only String.dropRight", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.dropRight only when the subject folds to a decoded portable literal and the count folds to a Nat literal, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.dropRight expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringDropRight(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.stripPrefix.literal", feature: "literal-only String.stripPrefix", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.stripPrefix only when both operands fold to decoded portable literals, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.stripPrefix expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringStripPrefix(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.stripSuffix.literal", feature: "literal-only String.stripSuffix", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.stripSuffix only when both operands fold to decoded portable literals, emitting a checked bounded String constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.stripSuffix expression");
  env.context.requiresString = true;
  return c(stringConstructorNameFromDecodedValue(env.context, foldP6LiteralStringStripSuffix(expr.args[0]!, expr.args[1]!)));
});

coreOperationLowerings.register({
  semanticId: "core.string.length.literal", feature: "literal-only String.length", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.length only when its operand is a decoded portable literal, emitting a Nat literal into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P6 malformed String.length expression");
  return natLiteral(String(Array.from(foldP6LiteralStringValue(expr.args[0]!, "String.length")).length));
});

coreOperationLowerings.register({
  semanticId: "core.string.utf8ByteSize.literal", feature: "literal-only String.utf8ByteSize", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.utf8ByteSize only when its operand is a decoded portable literal, emitting the UTF-8 byte count as a Nat literal into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P6 malformed String.utf8ByteSize expression");
  return natLiteral(String(p6Utf8ByteSizeOfDecodedString(foldP6LiteralStringValue(expr.args[0]!, "String.utf8ByteSize"))));
});

coreOperationLowerings.register({
  semanticId: "core.string.isEmpty.literal", feature: "literal-only String.isEmpty", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.isEmpty only when its operand is a decoded portable literal, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P6 malformed String.isEmpty expression");
  return c(foldP6LiteralStringValue(expr.args[0]!, "String.isEmpty").length === 0 ? "Bool.true" : "Bool.false");
});


coreOperationLowerings.register({
  semanticId: "core.string.isNat.literal", feature: "literal-only String.isNat", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.isNat only when its operand is a decoded portable literal, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 1) throw new UnifiedBridgeUnsupported("P6 malformed String.isNat expression");
  return c(p6IsNatDecodedString(foldP6LiteralStringValue(expr.args[0]!, "String.isNat")) ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.string.startsWith.literal", feature: "literal-only String.startsWith", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.startsWith only when both operands are decoded portable literals, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.startsWith expression");
  const subject = foldP6LiteralStringValue(expr.args[0]!, "String.startsWith");
  const prefix = foldP6LiteralStringValue(expr.args[1]!, "String.startsWith");
  return c(subject.startsWith(prefix) ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.string.endsWith.literal", feature: "literal-only String.endsWith", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.endsWith only when both operands are decoded portable literals, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.endsWith expression");
  const subject = foldP6LiteralStringValue(expr.args[0]!, "String.endsWith");
  const suffix = foldP6LiteralStringValue(expr.args[1]!, "String.endsWith");
  return c(subject.endsWith(suffix) ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.string.contains.literal", feature: "literal-only String.contains", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.contains only when both operands are decoded portable literals, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.contains expression");
  const subject = foldP6LiteralStringValue(expr.args[0]!, "String.contains");
  const needle = foldP6LiteralStringValue(expr.args[1]!, "String.contains");
  return c(subject.includes(needle) ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.string.isPrefixOf.literal", feature: "literal-only String.isPrefixOf", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.isPrefixOf only when both operands are decoded portable literals, emitting a Bool constructor into frozen Core with Lean's prefix-first argument order."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.isPrefixOf expression");
  const prefix = foldP6LiteralStringValue(expr.args[0]!, "String.isPrefixOf");
  const subject = foldP6LiteralStringValue(expr.args[1]!, "String.isPrefixOf");
  return c(subject.startsWith(prefix) ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.string.beq.literal", feature: "literal-only String.beq", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers String.beq only when both operands are decoded portable literals, emitting a Bool constructor into frozen Core."
}, (expr, env) => {
  if (expr.args.length !== 2) throw new UnifiedBridgeUnsupported("P6 malformed String.beq expression");
  const left = foldP6LiteralStringValue(expr.args[0]!, "String.beq");
  const right = foldP6LiteralStringValue(expr.args[1]!, "String.beq");
  return c(left === right ? "Bool.true" : "Bool.false");
});

coreOperationLowerings.register({
  semanticId: "core.beq", feature: "bounded String BEq", trust: "checked-core-library", status: "partial",
  notes: "Production P6 lowers primitive String == to a checked finite-literal-domain equality function. Nat/Bool BEq remain outside this P6 lowering path.",
}, (expr, env) => {
  if (expr.args.length < 2) throw new UnifiedBridgeUnsupported("P6 malformed BEq expression");
  const [left, right] = expr.args;
  const payload = expr.payload as { operandType?: string; primitive?: boolean } | undefined;
  if (!left || !right || payload?.primitive !== true || payload.operandType !== "String" || !isStringType(left.type) || !isStringType(right.type)) {
    throw new UnifiedBridgeUnsupported("Production P6 integrates only primitive bounded String equality for core.beq");
  }
  env.context.requiresString = true;
  env.context.requiresStringBeq = true;
  return app(app(c("ProofScript.Core.P6.String.beq"), lowerExpr(left, env.locals, env.globals, env.context)), lowerExpr(right, env.locals, env.globals, env.context));
});

export function listUnifiedCoreLowerings(): readonly CoreLoweringDescriptor[] {
  return coreOperationLowerings.descriptors();
}

function lowerDecidableEvidence(
  condition: IRExpr,
  frontendEvidence: IRExpr | undefined,
  locals: readonly string[],
  globals: ReadonlySet<string>,
  context: LoweringContext,
): Term {
  // Preserve the frozen canonical Nat decision path exactly. Canonical equality/order
  // conditions must not fall through to the generic dictionary path when their
  // evidence is malformed or mismatched.
  if (condition.kind === "op" && (condition.op === "proof.eq" || condition.op === "lean.le" || condition.op === "lean.lt")) {
    return lowerCanonicalNatDecidable(condition, frontendEvidence, locals, globals, context);
  }
  if (!frontendEvidence || frontendEvidence.type.form !== "nominal" || frontendEvidence.type.family !== "lean.decidable" || frontendEvidence.type.args?.length !== 1 || frontendEvidence.type.args[0]?.kind !== "term") {
    throw new UnifiedBridgeUnsupported("Wave D generic proposition-if requires explicit Decidable(p) evidence");
  }
  if (stableJson(frontendEvidence.type.args[0].value) !== stableJson(condition)) {
    throw new UnifiedBridgeUnsupported("Wave D Decidable evidence proposition does not match the conditional proposition");
  }
  context.requiresDecidable = true;
  return lowerExpr(frontendEvidence, locals, globals, context);
}

function lowerCanonicalNatDecidable(
  condition: IRExpr,
  frontendEvidence: IRExpr | undefined,
  locals: readonly string[],
  globals: ReadonlySet<string>,
  context: LoweringContext,
): Term {
  if (condition.kind !== "op") throw new UnifiedBridgeUnsupported("Wave B proposition if currently supports canonical Nat equality/order only");
  context.requiresDecidable = true;
  if (condition.op === "proof.eq" && condition.args.length === 2) {
    const [left, right] = condition.args;
    if (!left || !right || !isNatType(left.type) || !isNatType(right.type)) {
      throw new UnifiedBridgeUnsupported("Wave B equality-if currently supports Nat equality only");
    }
    if (frontendEvidence) throw new UnifiedBridgeUnsupported("Wave B Nat equality-if received unexpected explicit decision evidence");
    // Keep the WaveA computational model in the artifact for compatibility,
    // but branch selection now consumes the proof-carrying Decidable value.
    context.requiresNatBeq = true;
    return app(app(c(WAVEB_NAT_DEC_EQ), lowerExpr(left, locals, globals, context)), lowerExpr(right, locals, globals, context));
  }
  if ((condition.op === "lean.le" || condition.op === "lean.lt") && condition.args.length === 3) {
    const [dictionary, left, right] = condition.args;
    const className = condition.op === "lean.le" ? "LE" : "LT";
    if (!dictionary || !left || !right || !isNatType(left.type) || !isNatType(right.type) || !isCanonicalNatOrderDictionary(dictionary, className)) {
      throw new UnifiedBridgeUnsupported(`Wave B proposition if integrates only canonical ${className} Nat ordering`);
    }
    if (!isCanonicalNatOrderDecisionEvidence(frontendEvidence, className, left, right)) {
      throw new UnifiedBridgeUnsupported(`Wave B proposition if requires the matching canonical Decidable${className} Nat evidence selected by the frontend`);
    }
    context.requiresNatOrder = true;
    context.requiresNatBle = true;
    const fn = condition.op === "lean.le" ? WAVEB_NAT_DEC_LE : WAVEB_NAT_DEC_LT;
    return app(app(c(fn), lowerExpr(left, locals, globals, context)), lowerExpr(right, locals, globals, context));
  }
  throw new UnifiedBridgeUnsupported(`Wave B proposition if does not yet integrate condition operation '${condition.op}'`);
}

function isCanonicalNatOrderDecisionEvidence(evidence: IRExpr | undefined, className: "LE" | "LT", left: IRExpr, right: IRExpr): boolean {
  if (!evidence || evidence.kind !== "call" || evidence.callee !== `__psDecidable${className}Nat` || evidence.args.length !== 2) return false;
  return stableJson(evidence.args[0]) === stableJson(left) && stableJson(evidence.args[1]) === stableJson(right);
}

function isStringType(type: IRType): boolean { return type.form === "nominal" && type.id === "String" && !(type.args?.length); }

function isNatType(type: IRType): boolean {
  return type.form === "nominal" && type.id === "Nat" && !(type.args?.length);
}

function isCanonicalNatOrderDictionary(expr: IRExpr, className: "LE" | "LT"): boolean {
  if (expr.kind !== "var" || expr.name !== `__psInst${className}Nat`) return false;
  return expr.type.form === "nominal"
    && expr.type.family === `lean.class:${className}`
    && (expr.type.args?.length === 1)
    && expr.type.args[0]?.kind === "type"
    && isNatType(expr.type.args[0].value);
}

function isCanonicalNatHSubDictionary(expr: IRExpr): boolean {
  if (expr.kind !== "call" || expr.callee !== "__psInstHSub" || expr.args.length !== 2) return false;
  const [carrier, homogeneous] = expr.args;
  if (!carrier || carrier.kind !== "type" || !isNatType(carrier.value)) return false;
  if (!homogeneous || homogeneous.kind !== "var" || homogeneous.name !== "__psInstSubNat") return false;
  return expr.type.form === "nominal"
    && expr.type.family === "lean.class:HSub"
    && (expr.type.args?.length === 3)
    && expr.type.args.every(arg => arg.kind === "type" && isNatType(arg.value));
}

function isCanonicalNatHMulDictionary(expr: IRExpr): boolean {
  if (expr.kind !== "call" || expr.callee !== "__psInstHMul" || expr.args.length !== 2) return false;
  const [carrier, homogeneous] = expr.args;
  if (!carrier || carrier.kind !== "type" || !isNatType(carrier.value)) return false;
  if (!homogeneous || homogeneous.kind !== "var" || homogeneous.name !== "__psInstMulNat") return false;
  return expr.type.form === "nominal"
    && expr.type.family === "lean.class:HMul"
    && (expr.type.args?.length === 3)
    && expr.type.args.every(arg => arg.kind === "type" && isNatType(arg.value));
}

/** Exact Lean 4.33.1 protected inductive Nat.le : Nat → Nat → Prop. */
function coreNatLeDeclaration(): CoreDeclaration {
  const nat = c("Nat");
  const prop: Term = { tag: "sort", level: levelOfNat(0) };
  const le = (left: Term, right: Term): Term => app(app(c(UI4_NAT_LE), left), right);
  const succ = (n: Term): Term => app(c("Nat.succ"), n);
  return {
    kind: "inductive",
    name: UI4_NAT_LE,
    levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: prop } },
    numParams: 1,
    numIndices: 1,
    constructors: [
      {
        name: "Nat.le.refl",
        type: { tag: "pi", domain: nat, binderInfo: "implicit", body: le({ tag: "bvar", index: 0 }, { tag: "bvar", index: 0 }) },
      },
      {
        name: "Nat.le.step",
        type: {
          tag: "pi", domain: nat, binderInfo: "implicit", body: {
            tag: "pi", domain: nat, binderInfo: "implicit", body: {
              tag: "pi", domain: le({ tag: "bvar", index: 1 }, { tag: "bvar", index: 0 }), binderInfo: "explicit",
              body: le({ tag: "bvar", index: 2 }, succ({ tag: "bvar", index: 1 })),
            },
          },
        },
      },
    ],
  };
}

/** Exact Lean 4.33.1 protected def Nat.lt n m := Nat.le (Nat.succ n) m. */
function coreNatLtDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const prop: Term = { tag: "sort", level: levelOfNat(0) };
  return {
    kind: "definition",
    name: UI4_NAT_LT,
    levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: prop } },
    value: {
      tag: "lam", domain: nat, binderInfo: "explicit", body: {
        tag: "lam", domain: nat, binderInfo: "explicit",
        body: app(app(c(UI4_NAT_LE), app(c("Nat.succ"), { tag: "bvar", index: 1 })), { tag: "bvar", index: 0 }),
      },
    },
    reducibility: "regular",
  };
}

/**
 * Exact logical model of Lean 4.33.1 Nat.mul for the UI2 bridge.
 * Lean source: Nat.mul a 0 = 0; Nat.mul a (succ b) = Nat.add (Nat.mul a b) a.
 * This declaration is untrusted library material: it is inserted into Core and
 * accepted only if the frozen standalone kernel checks it.
 */
function coreNatMulDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const motive: Term = { tag: "lam", domain: nat, body: nat, binderInfo: "explicit" };
  const step: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit",
    body: {
      tag: "lam", domain: nat, binderInfo: "explicit",
      body: app(app(c("Nat.add"), { tag: "bvar", index: 0 }), { tag: "bvar", index: 3 }),
    },
  };
  const rec: Term = { tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] };
  const body = app(app(app(app(rec, motive), c("Nat.zero")), step), { tag: "bvar", index: 0 });
  return {
    kind: "definition",
    name: UI2_INTERNAL_NAT_MUL,
    levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: nat } },
    value: { tag: "lam", domain: nat, binderInfo: "explicit", body: { tag: "lam", domain: nat, binderInfo: "explicit", body } },
    reducibility: "regular",
  };
}

/** Checked Core predecessor used only by the UI3 Nat.sub library model. */
function coreNatPredDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const motive: Term = { tag: "lam", domain: nat, body: nat, binderInfo: "explicit" };
  const step: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit",
    body: { tag: "lam", domain: nat, binderInfo: "explicit", body: { tag: "bvar", index: 1 } },
  };
  const rec: Term = { tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] };
  const body = app(app(app(app(rec, motive), c("Nat.zero")), step), { tag: "bvar", index: 0 });
  return {
    kind: "definition", name: UI3_INTERNAL_NAT_PRED, levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: nat },
    value: { tag: "lam", domain: nat, binderInfo: "explicit", body }, reducibility: "regular",
  };
}

/**
 * Exact logical model of Nat subtraction for UI3:
 * sub a 0 = a; sub a (succ b) = pred (sub a b).
 * The definition is untrusted library Core and must be accepted by frozen v68.
 */
function coreNatSubDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const motive: Term = { tag: "lam", domain: nat, body: nat, binderInfo: "explicit" };
  const step: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit",
    body: {
      tag: "lam", domain: nat, binderInfo: "explicit",
      body: app(c(UI3_INTERNAL_NAT_PRED), { tag: "bvar", index: 0 }),
    },
  };
  const rec: Term = { tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] };
  const body = app(app(app(app(rec, motive), { tag: "bvar", index: 1 }), step), { tag: "bvar", index: 0 });
  return {
    kind: "definition", name: UI3_INTERNAL_NAT_SUB, levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: nat } },
    value: { tag: "lam", domain: nat, binderInfo: "explicit", body: { tag: "lam", domain: nat, binderInfo: "explicit", body } },
    reducibility: "regular",
  };
}


/** Checked computational model of Lean 4.33.1 Nat.ble. */
function coreNatBleDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const bool = c("Bool");
  const natToBool: Term = { tag: "pi", domain: nat, binderInfo: "explicit", body: bool };
  const motiveN: Term = { tag: "lam", domain: nat, binderInfo: "explicit", body: natToBool };
  const baseN: Term = { tag: "lam", domain: nat, binderInfo: "explicit", body: c("Bool.true") };
  const motiveM: Term = { tag: "lam", domain: nat, binderInfo: "explicit", body: bool };
  const stepM: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit", body: {
      tag: "lam", domain: bool, binderInfo: "explicit",
      body: app({ tag: "bvar", index: 3 }, { tag: "bvar", index: 1 }),
    },
  };
  const recM: Term = app(app(app(app({ tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] }, motiveM), c("Bool.false")), stepM), { tag: "bvar", index: 0 });
  const stepN: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit", body: {
      tag: "lam", domain: natToBool, binderInfo: "explicit", body: {
        tag: "lam", domain: nat, binderInfo: "explicit", body: recM,
      },
    },
  };
  const body = app(app(app(app({ tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] }, motiveN), baseN), stepN), { tag: "bvar", index: 0 });
  return {
    kind: "definition", name: WAVEA_NAT_BLE, levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: bool } },
    value: { tag: "lam", domain: nat, binderInfo: "explicit", body },
    reducibility: "regular",
  };
}

/** Checked computational model of Lean 4.33.1 Nat.beq. */
function coreNatBeqDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const bool = c("Bool");
  const natToBool: Term = { tag: "pi", domain: nat, binderInfo: "explicit", body: bool };
  const motiveBool: Term = { tag: "lam", domain: nat, binderInfo: "explicit", body: bool };
  const falseStep: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit", body: {
      tag: "lam", domain: bool, binderInfo: "explicit", body: c("Bool.false"),
    },
  };
  const baseNBody = app(app(app(app({ tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] }, motiveBool), c("Bool.true")), falseStep), { tag: "bvar", index: 0 });
  const baseN: Term = { tag: "lam", domain: nat, binderInfo: "explicit", body: baseNBody };
  const stepM: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit", body: {
      tag: "lam", domain: bool, binderInfo: "explicit",
      body: app({ tag: "bvar", index: 3 }, { tag: "bvar", index: 1 }),
    },
  };
  const recM = app(app(app(app({ tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] }, motiveBool), c("Bool.false")), stepM), { tag: "bvar", index: 0 });
  const stepN: Term = {
    tag: "lam", domain: nat, binderInfo: "explicit", body: {
      tag: "lam", domain: natToBool, binderInfo: "explicit", body: {
        tag: "lam", domain: nat, binderInfo: "explicit", body: recM,
      },
    },
  };
  const body = app(app(app(app({ tag: "const", name: "Nat.rec", levels: [levelOfNat(1)] }, motiveNForFunction(natToBool)), baseN), stepN), { tag: "bvar", index: 0 });
  return {
    kind: "definition", name: WAVEA_NAT_BEQ, levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: bool } },
    value: { tag: "lam", domain: nat, binderInfo: "explicit", body }, reducibility: "regular",
  };
}

function motiveNForFunction(codomain: Term): Term {
  return { tag: "lam", domain: c("Nat"), binderInfo: "explicit", body: codomain };
}

/** Strict comparison model: blt a b = ble (succ a) b, matching Nat.lt. */
function coreNatBltDefinition(): CoreDeclaration {
  const nat = c("Nat");
  const bool = c("Bool");
  return {
    kind: "definition", name: WAVEA_NAT_BLT, levelParams: [],
    type: { tag: "pi", domain: nat, binderInfo: "explicit", body: { tag: "pi", domain: nat, binderInfo: "explicit", body: bool } },
    value: {
      tag: "lam", domain: nat, binderInfo: "explicit", body: {
        tag: "lam", domain: nat, binderInfo: "explicit",
        body: app(app(c(WAVEA_NAT_BLE), app(c("Nat.succ"), { tag: "bvar", index: 1 })), { tag: "bvar", index: 0 }),
      },
    }, reducibility: "regular",
  };
}

function lowerVar(name: string, locals: readonly string[], globals: ReadonlySet<string>): Term {
  const local = locals.lastIndexOf(name);
  if (local >= 0) return { tag: "bvar", index: locals.length - 1 - local };
  if (globals.has(name)) return c(name);
  throw new UnifiedBridgeUnsupported(`UI4 unresolved/non-Core variable '${name}'`);
}

function natLiteral(text: string): Term {
  if (!/^[0-9]+$/.test(text)) throw new UnifiedBridgeUnsupported(`invalid Nat literal '${text}'`);
  const n = BigInt(text);
  // The current bootstrap has constructors but no compact OfNat Core primitive.
  // Bound the adapter so source input cannot manufacture enormous translated terms.
  if (n > 4096n) throw new UnifiedBridgeUnsupported(`UI4 Nat literal '${text}' exceeds the migration adapter bound 4096`);
  let out = c("Nat.zero");
  for (let i = 0n; i < n; i++) out = app(c("Nat.succ"), out);
  return out;
}

function universeForType(type: IRType) {
  if(type.form === "pi" && type.codomain) return universeForType(type.codomain);
  if(type.form === "nominal" && (type.id === "Nat" || type.id === "Bool" || type.id === "Int" || type.id === "String")) return levelOfNat(1);
  if(type.form === "nominal" && type.family?.startsWith("lean.class:")) return levelOfNat(1);
  if(type.form === "nominal" && (type.family === "core.typevar" || type.family === "core.option" || type.family === "core.list" || type.family === "core.except" || type.family?.startsWith("core.adt:") || type.family?.startsWith("lean.structure:"))) return levelOfNat(1);
  if(type.form === "sort" && type.sortAlias === "Prop") return levelOfNat(0);
  throw new UnifiedBridgeUnsupported(`Production P1 cannot determine recursor universe for type '${type.displayName}'`);
}

function c(name: string): Term { return { tag: "const", name, levels: [] }; }
function app(fn: Term, arg: Term): Term { return { tag: "app", fn, arg }; }

/** Shift free de Bruijn variables when inserting a generated binder above an already-lowered term. */
function liftTerm(term: Term, by = 1, cutoff = 0): Term {
  switch (term.tag) {
    case "sort": return term;
    case "const": return term;
    case "lit": return term;
    case "bvar": return term.index >= cutoff ? { tag: "bvar", index: term.index + by } : term;
    case "app": return { tag: "app", fn: liftTerm(term.fn, by, cutoff), arg: liftTerm(term.arg, by, cutoff) };
    case "lam": return { ...term, domain: liftTerm(term.domain, by, cutoff), body: liftTerm(term.body, by, cutoff + 1) };
    case "pi": return { ...term, domain: liftTerm(term.domain, by, cutoff), body: liftTerm(term.body, by, cutoff + 1) };
    case "let": return { ...term, type: liftTerm(term.type, by, cutoff), value: liftTerm(term.value, by, cutoff), body: liftTerm(term.body, by, cutoff + 1) };
    case "proj": return { ...term, expr: liftTerm(term.expr, by, cutoff) };
  }
}

function stableJson(value: unknown): string { return JSON.stringify(value); }
function sha256(text: string): string { return crypto.createHash("sha256").update(text).digest("hex"); }
