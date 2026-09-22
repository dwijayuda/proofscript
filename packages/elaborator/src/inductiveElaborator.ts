import {
  CoreDeclaration,
  Environment,
  Level,
  Term,
  TypeclassClassMetadata,
  TypeclassInstanceMetadata,
  checkAndAddDeclaration,
  collectTermLevelParams,
  infer,
  kernelWhnf,
  levelDefEq,
  levelParam,
  levelSucc,
  LevelZero,
} from "@proofscript/kernel";
import {
  ElaborationError,
  SurfaceBinder,
  SurfaceDeclaration,
  SurfaceTerm,
} from "@proofscript/syntax";

type StructureDeclaration = Extract<SurfaceDeclaration, { kind: "structure" }>;
type InductiveDeclaration = Extract<SurfaceDeclaration, { kind: "inductive" }>;

export type InductiveGlobalInfo = {
  levelParams: string[];
  structureFields?: string[];
  type?: Term;
  isClass?: boolean;
  classMeta?: TypeclassClassMetadata;
  instanceMeta?: TypeclassInstanceMetadata;
};

export interface InductiveElaborationHost {
  elaborateTerm(
    term: SurfaceTerm,
    locals: string[],
    localTypes: Term[],
    expectedType?: Term,
  ): Term;
  elaborateTelescopeType(
    params: SurfaceBinder[],
    result: SurfaceTerm,
    names: string[],
    types: Term[],
  ): Term;
  elaborateConstructorType(
    params: SurfaceBinder[],
    binders: SurfaceBinder[],
    result: SurfaceTerm | undefined,
    selfName: string,
    selfLevels: Level[],
  ): Term;
  countCorePis(term: Term): number;
  syncGlobals(globals: Map<string, InductiveGlobalInfo>, env: Environment): void;
}

export function elaborateStructureDeclaration(
  decl: StructureDeclaration,
  globals: Map<string, InductiveGlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  result: CoreDeclaration[],
  host: InductiveElaborationHost,
): void {
  const fields = decl.fields.map(field => ({
    name: field.name,
    type: host.elaborateTerm(field.type, [], []),
  }));
  for (const field of fields) {
    if (collectTermLevelParams(field.type).size > 0) {
      throw new ElaborationError(`K3c-section-vars0 does not yet implement universe-polymorphic structure field '${decl.name}.${field.name}'`);
    }
    const fieldSort = kernelWhnf(kernelEnv, infer(kernelEnv, [], field.type));
    if (fieldSort.tag !== "sort") throw new ElaborationError(`${decl.name}.${field.name}: structure field type is not a type`);
    const one = levelSucc(LevelZero);
    if (!levelDefEq(fieldSort.level, LevelZero) && !levelDefEq(fieldSort.level, one)) {
      throw new ElaborationError(`${decl.name}.${field.name}: K2c structures currently admit only Prop/Type-valued fields`);
    }
  }
  const self: Term = { tag: "const", name: decl.name, levels: [] };
  let ctorType: Term = self;
  for (let i = fields.length - 1; i >= 0; i--) ctorType = { tag: "pi", domain: fields[i].type, body: ctorType };
  const ind: CoreDeclaration = {
    kind: "inductive",
    name: decl.name,
    levelParams: [],
    type: { tag: "sort", level: levelSucc(LevelZero) },
    numParams: 0,
    numIndices: 0,
    constructors: [{ name: `${decl.name}.mk`, type: ctorType }],
  };
  checkAndAddDeclaration(kernelEnv, ind);
  result.push(ind);
  host.syncGlobals(globals, kernelEnv);

  const recEntry = kernelEnv.get(`${decl.name}.rec`);
  if (!recEntry || recEntry.declaration.kind !== "recursor") throw new ElaborationError(`internal: generated recursor missing for ${decl.name}`);
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const fieldSort = kernelWhnf(kernelEnv, infer(kernelEnv, [], field.type));
    if (fieldSort.tag !== "sort") throw new ElaborationError(`internal: projection field sort missing for ${decl.name}.${field.name}`);
    const motive: Term = { tag: "lam", domain: self, body: field.type };
    let minor: Term = { tag: "bvar", index: fields.length - 1 - i };
    for (let b = fields.length - 1; b >= 0; b--) minor = { tag: "lam", domain: fields[b].type, body: minor };
    let projected: Term = { tag: "const", name: recEntry.declaration.name, levels: [fieldSort.level] };
    for (const arg of [motive, minor, { tag: "bvar", index: 0 } as Term]) projected = { tag: "app", fn: projected, arg };
    // Each generated structure projection remains ordinary checked Core.
    const proj: CoreDeclaration = {
      kind: "definition",
      name: `${decl.name}.${field.name}`,
      levelParams: [],
      type: { tag: "pi", domain: self, body: field.type },
      value: { tag: "lam", domain: self, body: projected },
      reducibility: "regular",
    };
    checkAndAddDeclaration(kernelEnv, proj);
    result.push(proj);
    host.syncGlobals(globals, kernelEnv);
  }
  const structureInfo = globals.get(decl.name) ?? { levelParams: [] };
  globals.set(decl.name, { ...structureInfo, structureFields: fields.map(f => f.name) });
}

export function elaborateInductiveDeclaration(
  decl: InductiveDeclaration,
  globals: Map<string, InductiveGlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  result: CoreDeclaration[],
  host: InductiveElaborationHost,
): void {
  const type = host.elaborateTelescopeType(decl.params, decl.type, [], []);
  const usedInType = collectTermLevelParams(type);
  const levelParams = decl.availableLevels.filter(p => usedInType.has(p));
  const selfInfo: InductiveGlobalInfo = { levelParams, type };
  globals.set(decl.name, selfInfo);
  const selfLevels = levelParams.map(levelParam);
  const numParams = decl.params.length;
  const surfaceIndexCore = host.elaborateTerm(decl.type, decl.params.map(p => p.name), []);
  const numIndices = host.countCorePis(surfaceIndexCore);
  const constructors = decl.constructors.map(c => ({
    name: `${decl.name}.${c.name}`,
    type: host.elaborateConstructorType(decl.params, c.binders, c.result, decl.name, selfLevels),
  }));
  const core: CoreDeclaration = { kind: "inductive", name: decl.name, levelParams, type, numParams, numIndices, constructors };
  checkAndAddDeclaration(kernelEnv, core);
  result.push(core);
  host.syncGlobals(globals, kernelEnv);
}
