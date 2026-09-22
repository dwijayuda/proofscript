import {
  CoreDeclaration,
  Environment,
  Term,
  TypeclassEnvironmentMetadata,
  emptyTypeclassEnvironment,
  checkAndAddDeclaration,
  collectTermLevelParams,
} from "@proofscript/kernel";
import {
  ElaborationError,
  SurfaceDeclaration,
  SurfaceTerm,
} from "@proofscript/syntax";
import { compileEquationDefinition, compileStructuralRecursion, containsSurfaceName } from "@proofscript/recursion";
import { TypeclassEnvironment } from "@proofscript/typeclass";
import { elaborateInductiveDeclaration, elaborateStructureDeclaration } from "./inductiveElaborator";
import { generateStructuralEquationTheorems } from "./matchElaborator";
import { GlobalInfo, InitialGlobalInfo, qualifyDeclarationName, syncGlobals } from "./globalEnvironment";
import { elaborateClassDeclaration, elaborateInstanceDeclaration } from "./classElaborator";
import { countCorePis, elabConstructorType, elabTelescopeType, elabTelescopeValue } from "./telescopeElaboration";

export type ElaborateTermFn = (
  term: SurfaceTerm,
  locals: string[],
  localTypes: Term[],
  globals: Map<string, GlobalInfo>,
  available: Set<string>,
  kernelEnv: Environment,
  expectedType?: Term,
) => Term;

export function elaborateProgramCore(
  decls: SurfaceDeclaration[],
  initialGlobals: readonly InitialGlobalInfo[] = [],
  initialDeclarations: readonly CoreDeclaration[] = [],
  initialTypeclasses: TypeclassEnvironmentMetadata = emptyTypeclassEnvironment(),
  elaborateTerm: ElaborateTermFn,
): { declarations: CoreDeclaration[]; typeclasses: TypeclassEnvironmentMetadata } {
  const globals = new Map<string, GlobalInfo>(initialGlobals.map(g => [g.name, { levelParams: [...g.levelParams] }]));
  const kernelEnv = new Environment({ implementationProfile: 'KERNEL-level-instantiation-conformance1' });
  for (const decl of initialDeclarations) checkAndAddDeclaration(kernelEnv, decl);
  syncGlobals(globals, kernelEnv);
  const typeclasses = new TypeclassEnvironment(initialTypeclasses);
  for(const c of initialTypeclasses.classes){const prev=globals.get(c.name)??{levelParams:[]};globals.set(c.name,{...prev,isClass:true,classMeta:{...c,params:c.params.map(p=>({...p})),fields:c.fields.map(f=>({...f}))},structureFields:c.fields.map(f=>f.name)});}
  for(const i of initialTypeclasses.instances){const prev=globals.get(i.name)??{levelParams:[]};globals.set(i.name,{...prev,instanceMeta:{...i}});}
  let nextTypeclassOrder = Math.max(-1,...initialTypeclasses.classes.map(c=>c.declarationOrder),...initialTypeclasses.instances.map(i=>i.declarationOrder))+1;

  const result: CoreDeclaration[] = [];
  for (const sourceDecl of decls) {
    const fromEquationClauses = sourceDecl.kind === "equationDefinition";
    const compiledDecl = (fromEquationClauses ? compileEquationDefinition(sourceDecl) : sourceDecl) as Exclude<SurfaceDeclaration, { kind: "equationDefinition" }>;
    const sourceName = compiledDecl.name;
    const qualifiedName = qualifyDeclarationName(sourceName, compiledDecl.namespacePath);
    const recursiveAliases = [...new Set([sourceName, qualifiedName])];
    const structurallyRecursive = compiledDecl.kind === "definition" && recursiveAliases.some(name => containsSurfaceName(compiledDecl.value, name));
    const preparedDecl = compiledDecl.kind === "definition"
      ? { ...compiledDecl, value: compileStructuralRecursion(sourceName, compiledDecl.binders, compiledDecl.value, recursiveAliases) }
      : compiledDecl;
    const decl = { ...preparedDecl, name: qualifiedName } as Exclude<SurfaceDeclaration, { kind: "equationDefinition" }>;
    if (globals.has(decl.name)) throw new ElaborationError(`duplicate source declaration: ${decl.name}`);
    const available = new Set(decl.availableLevels);

    if (decl.kind === "class") {
      nextTypeclassOrder = elaborateClassDeclaration(decl, globals, available, kernelEnv, result, typeclasses, nextTypeclassOrder, {
        elaborateTerm: (term, locals, localTypes, expectedType) => elaborateTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType),
        elaborateTelescopeType: (binders, resultTerm, names, types) => elabTelescopeType(binders, resultTerm, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateTelescopeValue: (binders, value, expectedResult, names, types) => elabTelescopeValue(binders, value, expectedResult, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateConstructorType: (params, binders, resultTerm, selfName, selfLevels, globalsOverride) => elabConstructorType(params, binders, resultTerm, selfName, selfLevels, globalsOverride ?? globals, available, kernelEnv, elaborateTerm),
        syncGlobals,
      });
      continue;
    }

    if (decl.kind === "structure") {
      elaborateStructureDeclaration(decl, globals, available, kernelEnv, result, {
        elaborateTerm: (term, locals, localTypes, expectedType) => elaborateTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType),
        elaborateTelescopeType: (params, resultTerm, names, types) => elabTelescopeType(params, resultTerm, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateConstructorType: (params, binders, resultTerm, selfName, selfLevels) => elabConstructorType(params, binders, resultTerm, selfName, selfLevels, globals, available, kernelEnv, elaborateTerm),
        countCorePis,
        syncGlobals,
      });
      continue;
    }

    if (decl.kind === "inductive") {
      elaborateInductiveDeclaration(decl, globals, available, kernelEnv, result, {
        elaborateTerm: (term, locals, localTypes, expectedType) => elaborateTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType),
        elaborateTelescopeType: (params, resultTerm, names, types) => elabTelescopeType(params, resultTerm, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateConstructorType: (params, binders, resultTerm, selfName, selfLevels) => elabConstructorType(params, binders, resultTerm, selfName, selfLevels, globals, available, kernelEnv, elaborateTerm),
        countCorePis,
        syncGlobals,
      });
      continue;
    }

    if (decl.kind === "instance") {
      nextTypeclassOrder = elaborateInstanceDeclaration(decl, globals, available, kernelEnv, result, typeclasses, nextTypeclassOrder, {
        elaborateTerm: (term, locals, localTypes, expectedType) => elaborateTerm(term, locals, localTypes, globals, available, kernelEnv, expectedType),
        elaborateTelescopeType: (binders, resultTerm, names, types) => elabTelescopeType(binders, resultTerm, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateTelescopeValue: (binders, value, expectedResult, names, types) => elabTelescopeValue(binders, value, expectedResult, names, types, globals, available, kernelEnv, elaborateTerm),
        elaborateConstructorType: (params, binders, resultTerm, selfName, selfLevels, globalsOverride) => elabConstructorType(params, binders, resultTerm, selfName, selfLevels, globalsOverride ?? globals, available, kernelEnv, elaborateTerm),
        syncGlobals,
      });
      continue;
    }

    const type = elabTelescopeType(decl.binders, decl.type, [], [], globals, available, kernelEnv, elaborateTerm);
    const surfaceValue = decl.kind !== "axiom" ? decl.value : undefined;
    const value = surfaceValue
      ? elabTelescopeValue(decl.binders, surfaceValue, decl.type, [], [], globals, available, kernelEnv, elaborateTerm)
      : undefined;
    const used = new Set<string>();
    for (const p of collectTermLevelParams(type)) used.add(p);
    if (value) for (const p of collectTermLevelParams(value)) used.add(p);
    const levelParams = decl.availableLevels.filter(p => used.has(p));
    const core: CoreDeclaration = decl.kind === "axiom"
      ? { kind: "axiom", name: decl.name, levelParams, type }
      : decl.kind === "definition"
        ? { kind: "definition", name: decl.name, levelParams, type, value: value!, reducibility: "regular" }
        : decl.kind === "abbrev"
          ? { kind: "definition", name: decl.name, levelParams, type, value: value!, reducibility: "abbrev" }
          : decl.kind === "opaque"
            ? { kind: "opaque", name: decl.name, levelParams, type, value: value! }
            : decl.kind === "example"
              ? { kind: "example", name: decl.name, levelParams, type, value: value! }
              : { kind: "theorem", name: decl.name, levelParams, type, value: value! };
    checkAndAddDeclaration(kernelEnv, core);
    result.push(core);
    syncGlobals(globals, kernelEnv);

    if ((structurallyRecursive || fromEquationClauses) && decl.kind === "definition") {
      if (decl.value.tag !== "match") throw new ElaborationError("internal: equation/match definition did not normalize to a match body");
      if (core.kind !== "definition") throw new ElaborationError("internal: recursive def did not lower to a definition declaration");
      const equationSource = { ...decl, value: compiledDecl.kind === "definition" ? compiledDecl.value : decl.value } as Extract<SurfaceDeclaration, { kind: "definition" }>;
      if (equationSource.value.tag !== "match") throw new ElaborationError("internal: equation source did not normalize to a match body");
      const equations = generateStructuralEquationTheorems(equationSource, core, equationSource.value, kernelEnv, {
        elaborateTerm: (surface, scopedLocals, scopedTypes, scopedExpected) => elaborateTerm(surface, scopedLocals, scopedTypes, globals, available, kernelEnv, scopedExpected),
      });
      for (const equation of equations) {
        checkAndAddDeclaration(kernelEnv, equation);
        result.push(equation);
        syncGlobals(globals, kernelEnv);
      }
    }
  }
  return {declarations:result,typeclasses:typeclasses.snapshot()};
}