import {
  Level,
  LevelZero,
  instantiateLevel,
  levelDefEq,
  levelOfNat,
  levelParams,
  levelStructuralEq,
  prettyLevel,
} from "./level";

/** Lean-compatible trusted Core expression slice; v15 adds raw projections and v16 expands strictly-positive recursion admission. */
export type BinderInfo = "explicit" | "implicit" | "strictImplicit" | "instImplicit";
export function binderInfoOf(term: { binderInfo?: BinderInfo }): BinderInfo { return term.binderInfo ?? "explicit"; }
export type Term =
  | { tag: "sort"; level: Level }
  | { tag: "bvar"; index: number }
  | { tag: "const"; name: string; levels: Level[] }
  | { tag: "app"; fn: Term; arg: Term }
  | { tag: "lam"; domain: Term; body: Term; binderInfo?: BinderInfo }
  | { tag: "pi"; domain: Term; body: Term; binderInfo?: BinderInfo }
  | { tag: "let"; type: Term; value: Term; body: Term; nondep: boolean }
  | { tag: "proj"; typeName: string; index: number; expr: Term };

export interface DeclarationHeader {
  name: string;
  /** Universe parameters in declaration order, corresponding to Lean levelParams. */
  levelParams: string[];
}

export interface CoreConstructor { name: string; type: Term; }

/** One member of a trusted mutual-inductive block. v24 starts direct mutual recursion, v25 adds shared uniform parameters, and v26 adds per-family indices. */
export interface CoreMutualInductiveMember {
  name: string;
  type: Term;
  numParams: number;
  numIndices: number;
  constructors: CoreConstructor[];
}

export type CoreDeclaration =
  | (DeclarationHeader & { kind: "quot" })
  | (DeclarationHeader & {
      kind: "mutualInductive";
      /** Deterministic block identifier; not installed as a logical constant. */
      inductives: CoreMutualInductiveMember[];
    })
  | (DeclarationHeader & { kind: "axiom"; type: Term })
  | (DeclarationHeader & { kind: "theorem"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "opaque"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "example"; type: Term; value: Term })
  | (DeclarationHeader & { kind: "definition"; type: Term; value: Term; reducibility: "regular" | "abbrev" })
  | (DeclarationHeader & {
      kind: "inductive";
      type: Term;
      /** Number of uniform inductive parameters preceding indices in the type telescope. */
      numParams: number;
      /** Number of indices following parameters in the type telescope. */
      numIndices: number;
      constructors: CoreConstructor[];
    });

export interface TypeclassFieldMetadata { name: string; /** Closed field type, prefixed by the class parameter telescope when numParams > 0. */ type: Term; }
export interface TypeclassParamMetadata { name: string; binderInfo: BinderInfo; }
export interface TypeclassClassMetadata {
  name: string;
  numParams: number;
  params: TypeclassParamMetadata[];
  fields: TypeclassFieldMetadata[];
  declarationOrder: number;
}
export interface TypeclassInstanceMetadata {
  name: string;
  className: string;
  priority: number;
  declarationOrder: number;
  scope: "global";
  anonymous: boolean;
}
export interface TypeclassEnvironmentMetadata {
  classes: TypeclassClassMetadata[];
  instances: TypeclassInstanceMetadata[];
}
export const emptyTypeclassEnvironment = (): TypeclassEnvironmentMetadata => ({ classes: [], instances: [] });

/**
 * Nonlogical source/module provenance carried by the v12 artifact envelope.
 * These records never participate in kernel inference or definitional equality.
 * Fingerprints are validated by @proofscript/kernel-codec, outside kernel typing.
 */
export interface CoreModuleImportMetadata {
  module: string;
  /** K3b currently supports only ordinary/plain imports. */
  mode: "plain";
  /** Fingerprint of the imported module interface. */
  interfaceSha256: string;
}
export interface CoreModuleMetadata {
  name: string;
  sourceSha256: string;
  imports: CoreModuleImportMetadata[];
  /** Declarations physically owned by this source module. */
  declarations: string[];
  /** K3b exports every owned declaration; explicit metadata prepares future visibility rules. */
  exports: string[];
  /** Semantic module-interface fingerprint, including dependency interfaces. */
  interfaceSha256: string;
  /** Deterministic frontend cache identity, including source and dependency interfaces. */
  cacheKeySha256: string;
}
export interface CoreModulesMetadata {
  entry: string;
  interfaceFormatVersion: 1;
  cacheKeyFormatVersion: 1;
  /** Fingerprint of the pre-module elaboration environment (for example --std). */
  baseEnvironmentSha256: string;
  modules: CoreModuleMetadata[];
}

export interface CoreArtifact {
  format: "proofscript-core";
  formatVersion: 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71;
  proofscriptReference: "v0.1";
  leanSemanticBaseline: "4.33.1";
  implementationProfile: "K3b-module-interfaces0" | "K3c-names0" | "K3c-sections-open0" | "K3c-section-vars0" | "KERNEL-quotients0" | "KERNEL-empty-inductives0" | "KERNEL-structure-eta0" | "KERNEL-inductive-positivity0" | "KERNEL-indexed-recursors0" | "KERNEL-indexed-projections0" | "KERNEL-prop-elimination0" | "KERNEL-recursor-k0" | "KERNEL-inductive-universes0" | "KERNEL-dependent-fields0" | "KERNEL-telescope-terms0" | "KERNEL-mutual-inductives0" | "KERNEL-mutual-parameters0" | "KERNEL-mutual-indices0" | "KERNEL-mutual-higher-order0" | "KERNEL-mutual-prop0" | "KERNEL-nested-inductives0" | "KERNEL-nested-parameters0" | "KERNEL-nested-indices0" | "KERNEL-nested-index-expressions0" | "KERNEL-nested-multiple-specializations0" | "KERNEL-nested-polymorphic0" | "KERNEL-nested-indexed-containers0" | "KERNEL-recursor-minor-order0" | "KERNEL-nested-deeper0" | "KERNEL-nested-deeper-generalization0" | "KERNEL-nested-deeper-parameters0" | "KERNEL-nested-deeper-indices0" | "KERNEL-nested-deeper-polymorphic0" | "KERNEL-nested-deeper-multiple-fields0" | "KERNEL-nested-deeper-prop0" | "KERNEL-nested-deeper-multi-parameter0" | "KERNEL-nested-deeper-multi-parameter-generalization0" | "KERNEL-nested-deeper-dependent-container-parameters0" | "KERNEL-uniform-parameter-defeq0" | "KERNEL-recursor-family-binder-info0" | "KERNEL-dependent-indexed-recursor-completion0" | "KERNEL-mutual-nested-generalization0" | "KERNEL-mutual-nested-parameters0" | "KERNEL-mutual-nested-indices0" | "KERNEL-mutual-nested-polymorphic0" | "KERNEL-mutual-nested-prop0" | "KERNEL-mutual-nested-indexed-containers0" | "KERNEL-mutual-nested-deeper0" | "KERNEL-mutual-nested-deeper-parameters0" | "KERNEL-mutual-nested-deeper-indices0" | "KERNEL-mutual-nested-deeper-polymorphic0" | "KERNEL-mutual-nested-deeper-prop0" | "KERNEL-mutual-nested-deeper-indexed-containers0" | "KERNEL-mutual-nested-deeper-multi-parameter-containers0" | "KERNEL-mutual-nested-deeper-dependent-container-parameters0" | "KERNEL-mutual-nested-deeper-multiple-fields0" | "KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0" | "KERNEL-mutual-nested-final-generalization-audit0" | "KERNEL-conversion-final-audit0" | "KERNEL-resource-bounds0" | "KERNEL-universe-conformance1" | "KERNEL-projection-conformance1" | "KERNEL-level-instantiation-conformance1";
  declarations: CoreDeclaration[];
  typeclasses: TypeclassEnvironmentMetadata;
  /** Present on emitted K3b/K3c project artifacts; may be absent on normalized historical artifacts. */
  modules?: CoreModulesMetadata;
}

export const Prop: Term = { tag: "sort", level: LevelZero };
export const Type: Term = { tag: "sort", level: levelOfNat(1) };

export function shift(term: Term, delta: number, cutoff = 0): Term {
  switch (term.tag) {
    case "sort":
    case "const":
      return term;
    case "bvar": {
      if (term.index < cutoff) return term;
      const index = term.index + delta;
      if (index < 0) throw new Error("internal: negative de Bruijn index after shift");
      return { tag: "bvar", index };
    }
    case "app":
      return { tag: "app", fn: shift(term.fn, delta, cutoff), arg: shift(term.arg, delta, cutoff) };
    case "lam":
      return { tag: "lam", domain: shift(term.domain, delta, cutoff), body: shift(term.body, delta, cutoff + 1), binderInfo: term.binderInfo };
    case "pi":
      return { tag: "pi", domain: shift(term.domain, delta, cutoff), body: shift(term.body, delta, cutoff + 1), binderInfo: term.binderInfo };
    case "let":
      return { tag: "let", type: shift(term.type, delta, cutoff), value: shift(term.value, delta, cutoff), body: shift(term.body, delta, cutoff + 1), nondep: term.nondep };
    case "proj":
      return { tag: "proj", typeName: term.typeName, index: term.index, expr: shift(term.expr, delta, cutoff) };
  }
}

function subst(term: Term, index: number, replacement: Term, depth = 0): Term {
  switch (term.tag) {
    case "sort":
    case "const":
      return term;
    case "bvar":
      return term.index === index + depth ? shift(replacement, depth) : term;
    case "app":
      return { tag: "app", fn: subst(term.fn,index,replacement,depth), arg: subst(term.arg,index,replacement,depth) };
    case "lam":
      return { tag: "lam", domain: subst(term.domain,index,replacement,depth), body: subst(term.body,index,replacement,depth+1), binderInfo: term.binderInfo };
    case "pi":
      return { tag: "pi", domain: subst(term.domain,index,replacement,depth), body: subst(term.body,index,replacement,depth+1), binderInfo: term.binderInfo };
    case "let":
      return { tag: "let", type: subst(term.type,index,replacement,depth), value: subst(term.value,index,replacement,depth), body: subst(term.body,index,replacement,depth+1), nondep: term.nondep };
    case "proj":
      return { tag: "proj", typeName: term.typeName, index: term.index, expr: subst(term.expr,index,replacement,depth) };
  }
}

/** Instantiate the outermost term binder in `body` with `arg`. */
export function instantiate(body: Term, arg: Term): Term {
  return shift(subst(body, 0, shift(arg, 1)), -1);
}

export function instantiateTermLevels(term: Term, params: readonly string[], args: readonly Level[]): Term {
  switch (term.tag) {
    case "sort": return { tag: "sort", level: instantiateLevel(term.level, params, args) };
    case "bvar": return term;
    case "const": return { tag: "const", name: term.name, levels: term.levels.map(l => instantiateLevel(l, params, args)) };
    case "app": return { tag: "app", fn: instantiateTermLevels(term.fn,params,args), arg: instantiateTermLevels(term.arg,params,args) };
    case "lam": return { tag: "lam", domain: instantiateTermLevels(term.domain,params,args), body: instantiateTermLevels(term.body,params,args), binderInfo: term.binderInfo };
    case "pi": return { tag: "pi", domain: instantiateTermLevels(term.domain,params,args), body: instantiateTermLevels(term.body,params,args), binderInfo: term.binderInfo };
    case "let": return { tag: "let", type: instantiateTermLevels(term.type,params,args), value: instantiateTermLevels(term.value,params,args), body: instantiateTermLevels(term.body,params,args), nondep: term.nondep };
    case "proj": return { tag: "proj", typeName: term.typeName, index: term.index, expr: instantiateTermLevels(term.expr,params,args) };
  }
}

export function collectTermLevelParams(term: Term, out = new Set<string>()): Set<string> {
  switch (term.tag) {
    case "sort": for (const p of levelParams(term.level)) out.add(p); return out;
    case "bvar": return out;
    case "const": for (const l of term.levels) for (const p of levelParams(l)) out.add(p); return out;
    case "app": collectTermLevelParams(term.fn,out); collectTermLevelParams(term.arg,out); return out;
    case "lam":
    case "pi": collectTermLevelParams(term.domain,out); collectTermLevelParams(term.body,out); return out;
    case "let": collectTermLevelParams(term.type,out); collectTermLevelParams(term.value,out); collectTermLevelParams(term.body,out); return out;
    case "proj": collectTermLevelParams(term.expr,out); return out;
  }
}

export function sameTerm(a: Term, b: Term): boolean {
  if (a.tag !== b.tag) return false;
  switch (a.tag) {
    case "sort": return b.tag === "sort" && levelStructuralEq(a.level,b.level);
    case "bvar": return b.tag === "bvar" && a.index === b.index;
    case "const": return b.tag === "const" && a.name === b.name && a.levels.length === b.levels.length && a.levels.every((l,i)=>levelStructuralEq(l,b.levels[i]));
    case "app": return b.tag === "app" && sameTerm(a.fn,b.fn) && sameTerm(a.arg,b.arg);
    case "lam": return b.tag === "lam" && binderInfoOf(a) === binderInfoOf(b) && sameTerm(a.domain,b.domain) && sameTerm(a.body,b.body);
    case "pi": return b.tag === "pi" && binderInfoOf(a) === binderInfoOf(b) && sameTerm(a.domain,b.domain) && sameTerm(a.body,b.body);
    case "let": return b.tag === "let" && a.nondep === b.nondep && sameTerm(a.type,b.type) && sameTerm(a.value,b.value) && sameTerm(a.body,b.body);
    case "proj": return b.tag === "proj" && a.typeName === b.typeName && a.index === b.index && sameTerm(a.expr,b.expr);
  }
}

export function coreLevelDefEq(a: Level,b: Level): boolean { return levelDefEq(a,b); }

export function pretty(term: Term, names: string[] = []): string {
  switch (term.tag) {
    case "sort": {
      if (levelDefEq(term.level, LevelZero)) return "Prop";
      const one = levelOfNat(1);
      if (levelDefEq(term.level, one)) return "Type";
      return `Sort ${prettyLevel(term.level)}`;
    }
    case "bvar": return names[names.length - 1 - term.index] ?? `#${term.index}`;
    case "const": {
      const suffix = term.levels.length ? `.{${term.levels.map(prettyLevel).join(", ")}}` : "";
      return `${term.name}${suffix}`;
    }
    case "app": {
      const args: Term[]=[]; let head:Term=term;
      while(head.tag==="app"){args.unshift(head.arg);head=head.fn;}
      const hp=pretty(head,names);
      const headText=head.tag==="lam"||head.tag==="pi"?`(${hp})`:hp;
      const argText=(a:Term)=>{const ap=pretty(a,names);return a.tag==="lam"||a.tag==="pi"?`(${ap})`:ap;};
      return `${headText}(${args.map(argText).join(", ")})`;
    }
    case "lam": { const n=freshName(names,"x"); const [o,c]=binderDelims(binderInfoOf(term)); return `fun ${o}${n}: ${pretty(term.domain,names)}${c} => ${pretty(term.body,[...names,n])}`; }
    case "pi": {
      if(binderInfoOf(term)==="explicit"&&!usesBVar0(term.body)){const cod=shift(term.body,-1,1);return `(${pretty(term.domain,names)} → ${pretty(cod,names)})`;}
      const n=freshName(names,"x");const [o,c]=binderDelims(binderInfoOf(term));return `(${o}${n}: ${pretty(term.domain,names)}${c} → ${pretty(term.body,[...names,n])})`;
    }
    case "let": {
      const n=freshName(names,"x");
      return `(${term.nondep ? "have" : "let"} ${n}: ${pretty(term.type,names)} := ${pretty(term.value,names)}; ${pretty(term.body,[...names,n])})`;
    }
    case "proj": return `(${pretty(term.expr,names)}).${term.index + 1}@${term.typeName}`;
  }
}

function usesBVar0(term:Term,depth=0):boolean{
  switch(term.tag){case"sort":case"const":return false;case"bvar":return term.index===depth;case"app":return usesBVar0(term.fn,depth)||usesBVar0(term.arg,depth);case"lam":case"pi":return usesBVar0(term.domain,depth)||usesBVar0(term.body,depth+1);case"let":return usesBVar0(term.type,depth)||usesBVar0(term.value,depth)||usesBVar0(term.body,depth+1);case"proj":return usesBVar0(term.expr,depth);}
}
function freshName(names:string[],base:string):string{let i=names.length;let candidate=`${base}${i}`;while(names.includes(candidate))candidate=`${base}${++i}`;return candidate;}

function binderDelims(info:BinderInfo):[string,string]{switch(info){case"explicit":return["(",")"];case"implicit":return["{","}"];case"strictImplicit":return["⦃","⦄"];case"instImplicit":return["[","]"];}}
