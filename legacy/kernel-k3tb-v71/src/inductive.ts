import { BinderInfo, CoreDeclaration, CoreMutualInductiveMember, Term, binderInfoOf, shift } from "./core";
import { Level, LevelZero, levelParam } from "./level";

export interface SimpleCtorRule {
  ctor: string;
  fields: Term[];
  fieldBinderInfo: BinderInfo[];
  recursiveFields: boolean[];
  /**
   * WHNF field type for recursive arguments. In the v16 positivity profile this
   * may be a Pi telescope ending in the inductive application, e.g. Nat → I.
   * Legacy/direct recursive fields may omit this entry.
   */
  recursiveFieldTypes?: (Term | null)[];
  /** v24+ mutual slice: target family for a direct or higher-order positive recursive field, null otherwise. */
  recursiveTargets?: (string | null)[];
  /** v29 nested preprocessing: leading actual constructor arguments fixed by the restored container specialization. */
  ctorParamCount?: number;
  /** v29 nested preprocessing: explicit recursor target for each recursive field after auxiliary-family restoration. */
  recursiveRecursors?: (string | null)[];
}

export interface SimpleRecursorMetadata {
  inductive: string;
  numParams: number;
  numIndices: number;
  numMinors: number;
  rules: { ctor: string; nfields: number; recursiveFields: boolean[]; recursiveFieldTypes?: (Term | null)[]; recursiveTargets?: (string | null)[]; recursiveRecursors?: (string | null)[]; ctorParamCount?: number; minorIndex?: number }[];
  /** Present only on v24+ directly mutual recursors. v26 records per-family index counts. */
  mutual?: { inductives: string[]; motiveCount: number; recursors: string[]; indexCounts?: number[] };
}

export interface GeneratedRecursor {
  name: string;
  levelParams: string[];
  type: Term;
  metadata: SimpleRecursorMetadata;
}

type NTerm =
  | { tag: "var"; name: string }
  | { tag: "core"; term: Term }
  | { tag: "sort"; level: Level }
  | { tag: "const"; name: string; levels: Level[] }
  | { tag: "app"; fn: NTerm; arg: NTerm }
  | { tag: "proj"; typeName: string; index: number; expr: NTerm }
  | { tag: "lam"; name: string; domain: NTerm; body: NTerm; binderInfo: BinderInfo }
  | { tag: "let"; name: string; type: NTerm; value: NTerm; body: NTerm; nondep: boolean }
  | { tag: "pi"; name: string; domain: NTerm; body: NTerm; binderInfo: BinderInfo };

const v=(name:string):NTerm=>({tag:"var",name});
const core=(term:Term):NTerm=>({tag:"core",term});
const app=(fn:NTerm,arg:NTerm):NTerm=>({tag:"app",fn,arg});
function apps(fn:NTerm,args:NTerm[]):NTerm{let out=fn;for(const a of args)out=app(out,a);return out;}
type NBinding={name:string;domain:NTerm;binderInfo?:BinderInfo};
function pis(bindings:NBinding[],body:NTerm):NTerm{let out=body;for(let i=bindings.length-1;i>=0;i--)out={tag:"pi",name:bindings[i].name,domain:bindings[i].domain,body:out,binderInfo:bindings[i].binderInfo??"explicit"};return out;}

function lower(term:NTerm,names:string[]=[]):Term{
  switch(term.tag){
    case"var":{for(let i=names.length-1;i>=0;i--)if(names[i]===term.name)return{tag:"bvar",index:names.length-1-i};throw new Error(`internal recursor generator: unbound named variable ${term.name}`);}
    case"core":return shift(term.term,0);
    case"sort":return{tag:"sort",level:term.level};
    case"const":return{tag:"const",name:term.name,levels:term.levels};
    case"app":return{tag:"app",fn:lower(term.fn,names),arg:lower(term.arg,names)};
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:lower(term.expr,names)};
    case"lam":return{tag:"lam",domain:lower(term.domain,names),body:lower(term.body,[...names,term.name]),binderInfo:term.binderInfo};
    case"let":return{tag:"let",type:lower(term.type,names),value:lower(term.value,names),body:lower(term.body,[...names,term.name]),nondep:term.nondep};
    case"pi":return{tag:"pi",domain:lower(term.domain,names),body:lower(term.body,[...names,term.name]),binderInfo:term.binderInfo};
  }
}

function coreToNamed(term:Term,names:string[],allowTelescopeTerms=false):NTerm{
  switch(term.tag){
    case"bvar":{const n=names[names.length-1-term.index];if(!n)throw new Error(`internal recursor generator: unbound #${term.index}`);return v(n);}
    case"sort":return{tag:"sort",level:term.level};
    case"const":return{tag:"const",name:term.name,levels:term.levels};
    case"app":return app(coreToNamed(term.fn,names,allowTelescopeTerms),coreToNamed(term.arg,names,allowTelescopeTerms));
    case"proj":return{tag:"proj",typeName:term.typeName,index:term.index,expr:coreToNamed(term.expr,names,allowTelescopeTerms)};
    case"lam":{
      if(!allowTelescopeTerms)throw new Error("internal recursor generator: lambda in telescope metadata is unsupported");
      const n=`local${names.length}`;
      return{tag:"lam",name:n,domain:coreToNamed(term.domain,names,true),body:coreToNamed(term.body,[...names,n],true),binderInfo:binderInfoOf(term)};
    }
    case"let":{
      if(!allowTelescopeTerms)throw new Error("internal recursor generator: let in telescope metadata is unsupported in this historical kernel profile");
      const n=`local${names.length}`;
      return{tag:"let",name:n,type:coreToNamed(term.type,names,true),value:coreToNamed(term.value,names,true),body:coreToNamed(term.body,[...names,n],true),nondep:term.nondep};
    }
    case"pi":{const n=`local${names.length}`;return{tag:"pi",name:n,domain:coreToNamed(term.domain,names,allowTelescopeTerms),body:coreToNamed(term.body,[...names,n],allowTelescopeTerms),binderInfo:binderInfoOf(term)};}
  }
}

function flattenCoreApps(term:Term):{head:Term;args:Term[]}{const args:Term[]=[];let head=term;while(head.tag==="app"){args.unshift(head.arg);head=head.fn;}return{head,args};}

function flattenNamedApps(term:NTerm):{head:NTerm;args:NTerm[]}{const args:NTerm[]=[];let head=term;while(head.tag==="app"){args.unshift(head.arg);head=head.fn;}return{head,args};}

/** Build the pointwise induction-hypothesis type for a strictly-positive recursive field. */
function recursiveIHType(fieldType:Term,fieldVar:NTerm,motive:NTerm,names:string[]=[],allowTelescopeTerms=false):NTerm{
  if(fieldType.tag==="pi"){
    const n=`r${names.length}`;
    const domain=coreToNamed(fieldType.domain,names,allowTelescopeTerms);
    const applied=app(fieldVar,v(n));
    return{tag:"pi",name:n,domain,body:recursiveIHType(fieldType.body,applied,motive,[...names,n],allowTelescopeTerms),binderInfo:binderInfoOf(fieldType)};
  }
  return app(motive,fieldVar);
}

/**
 * Indexed analogue of recursiveIHType. At the terminal recursive family
 * application, the motive is applied to the recursive occurrence's indices
 * and then to the recursively-produced major. Pi binders are preserved so a
 * higher-order recursive field receives a pointwise induction hypothesis.
 */
function recursiveIndexedIHType(
  fieldType:Term,
  fieldVar:NTerm,
  motive:NTerm,
  inductiveName:string,
  numParams:number,
  numIndices:number,
  names:string[]=[],
  allowTelescopeTerms=false,
):NTerm{
  if(fieldType.tag==="pi"){
    const n=`r${names.length}`;
    const domain=coreToNamed(fieldType.domain,names,allowTelescopeTerms);
    const applied=app(fieldVar,v(n));
    return{
      tag:"pi",name:n,domain,
      body:recursiveIndexedIHType(fieldType.body,applied,motive,inductiveName,numParams,numIndices,[...names,n],allowTelescopeTerms),
      binderInfo:binderInfoOf(fieldType),
    };
  }
  const terminal=flattenNamedApps(coreToNamed(fieldType,names,allowTelescopeTerms));
  if(terminal.head.tag!=="const"||terminal.head.name!==inductiveName||terminal.args.length!==numParams+numIndices)
    throw new Error("internal recursive indexed recursor generator: malformed terminal recursive family application");
  return apps(motive,[...terminal.args.slice(numParams),fieldVar]);
}

/** Mutual-family analogue of recursiveIndexedIHType. The target motive may
 * belong to a different member, and the terminal family can have its own index
 * count. This preserves positive Pi codomains and yields Lean's pointwise IH. */
function recursiveMutualIHType(
  fieldType:Term,
  fieldVar:NTerm,
  motive:NTerm,
  targetName:string,
  numParams:number,
  numIndices:number,
  names:string[]=[],
  allowTelescopeTerms=false,
):NTerm{
  if(fieldType.tag==="pi"){
    const n=`r${names.length}`;
    const domain=coreToNamed(fieldType.domain,names,allowTelescopeTerms);
    const applied=app(fieldVar,v(n));
    return{
      tag:"pi",name:n,domain,
      body:recursiveMutualIHType(fieldType.body,applied,motive,targetName,numParams,numIndices,[...names,n],allowTelescopeTerms),
      binderInfo:binderInfoOf(fieldType),
    };
  }
  const terminal=flattenNamedApps(coreToNamed(fieldType,names,allowTelescopeTerms));
  if(terminal.head.tag!=="const"||terminal.head.name!==targetName||terminal.args.length!==numParams+numIndices)
    throw new Error("internal mutual recursor generator: malformed terminal recursive family application");
  return apps(motive,[...terminal.args.slice(numParams),fieldVar]);
}

export type RecursorGenerationProfile="legacy"|"lean4331";
export type MotiveUniversePolicy="fresh"|"prop";
const motiveBinderInfo=(profile:RecursorGenerationProfile,numMinors:number):BinderInfo=>profile==="lean4331"&&numMinors>0?"implicit":"explicit";
const recursorFamilyBinderInfo=(source:BinderInfo):BinderInfo=>source==="explicit"?"implicit":source;

function motiveUniverse(
  decl:Extract<CoreDeclaration,{kind:"inductive"}>,
  profile:RecursorGenerationProfile,
  policy:MotiveUniversePolicy,
):{ level:Level; levelParams:string[] }{
  if(policy==="prop") return{level:LevelZero,levelParams:[...decl.levelParams]};
  let motiveParam="u_motive",i=0;
  while(decl.levelParams.includes(motiveParam))motiveParam=`u_motive${++i}`;
  return{
    level:levelParam(motiveParam),
    levelParams:profile==="lean4331"?[motiveParam,...decl.levelParams]:[...decl.levelParams,motiveParam],
  };
}

/** Generate the Lean-shaped recursor for K1's non-indexed, parameterless, direct-recursion slice. */
export function generateSimpleRecursor(
  decl: Extract<CoreDeclaration,{kind:"inductive"}>,
  rules: SimpleCtorRule[],
  profile: RecursorGenerationProfile="legacy",
  motivePolicy:MotiveUniversePolicy="fresh",
  allowTelescopeTerms=false,
  fieldsFirstIHs=false,
): GeneratedRecursor {
  const motive=motiveUniverse(decl,profile,motivePolicy);
  const selfLevels=decl.levelParams.map(levelParam);
  const motiveLevel=motive.level;
  const self:NTerm={tag:"const",name:decl.name,levels:selfLevels};
  const motiveType:NTerm={tag:"pi",name:"major0",domain:self,body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"};
  const outer:NBinding[]=[{name:"motive",domain:motiveType,binderInfo:motiveBinderInfo(profile,rules.length)}];

  rules.forEach((rule,ctorIndex)=>{
    const fieldBindings:NBinding[]=[],ihBindings:NBinding[]=[];const fieldVars:NTerm[]=[];const fieldNames:string[]=[];
    rule.fields.forEach((field,fieldIndex)=>{
      const fieldName=`a${ctorIndex}_${fieldIndex}`;
      const contextNames=[...fieldNames];
      fieldBindings.push({name:fieldName,domain:coreToNamed(field,fieldNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?rule.fieldBinderInfo[fieldIndex]:"explicit"});fieldVars.push(v(fieldName));
      if(rule.recursiveFields[fieldIndex]){
        const recursiveType=rule.recursiveFieldTypes?.[fieldIndex];
        ihBindings.push({name:`ih${ctorIndex}_${fieldIndex}`,domain:recursiveType?recursiveIHType(recursiveType,v(fieldName),v("motive"),contextNames,allowTelescopeTerms):app(v("motive"),v(fieldName))});
      }
      fieldNames.push(fieldName);
    });
    const oldIH=[...ihBindings];let oldIHPos=0;const inner=fieldsFirstIHs?[...fieldBindings,...ihBindings]:fieldBindings.flatMap((b,i)=>rule.recursiveFields[i]?[b,oldIH[oldIHPos++]]:[b]);
    const ctorApp=apps({tag:"const",name:rule.ctor,levels:selfLevels},fieldVars);
    const minorType=pis(inner,app(v("motive"),ctorApp));
    outer.push({name:`minor${ctorIndex}`,domain:minorType});
  });

  outer.push({name:"major",domain:self});
  const type=lower(pis(outer,app(v("motive"),v("major"))));
  return{
    name:`${decl.name}.rec`,levelParams:motive.levelParams,type,
    metadata:{inductive:decl.name,numParams:0,numIndices:0,numMinors:rules.length,rules:rules.map(r=>({ctor:r.ctor,nfields:r.fields.length,recursiveFields:[...r.recursiveFields],...(r.recursiveFieldTypes?{recursiveFieldTypes:[...r.recursiveFieldTypes]}:{})}))},
  };
}


/**
 * Generate a recursor for the K2p non-indexed parameterized slice.
 * Constructor-local fields may depend on uniform parameters but recursive
 * fields remain outside this profile (the kernel rejects them before here).
 */
export function generateParameterizedSimpleRecursor(
  decl: Extract<CoreDeclaration,{kind:"inductive"}>,
  profile: RecursorGenerationProfile="legacy",
  rulesInput?: SimpleCtorRule[],
  motivePolicy:MotiveUniversePolicy="fresh",
  allowTelescopeTerms=false,
  fieldsFirstIHs=false,
  preserveFamilyBinderInfo=false,
): GeneratedRecursor {
  if (decl.numParams <= 0 || decl.numIndices !== 0) throw new Error("internal parameterized recursor generator: expected parameters and no indices");
  const motive=motiveUniverse(decl,profile,motivePolicy);
  const selfLevels=decl.levelParams.map(levelParam);const motiveLevel=motive.level;

  const paramBindings:NBinding[]=[];const paramNames:string[]=[];
  let typeTail=decl.type;
  for(let p=0;p<decl.numParams;p++){
    if(typeTail.tag!=="pi")throw new Error("internal parameterized recursor generator: short parameter telescope");
    const name=`p${p}`;paramBindings.push({name,domain:coreToNamed(typeTail.domain,paramNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(binderInfoOf(typeTail)):"implicit"):"explicit"});paramNames.push(name);typeTail=typeTail.body;
  }
  if(typeTail.tag!=="sort")throw new Error("internal parameterized recursor generator: result is not a sort");

  const self=apps({tag:"const",name:decl.name,levels:selfLevels},paramNames.map(v));
  const motiveType:NTerm={tag:"pi",name:"major0",domain:self,body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"};
  const outer:NBinding[]=[...paramBindings,{name:"motive",domain:motiveType,binderInfo:motiveBinderInfo(profile,decl.constructors.length)}];
  const rules:{ctor:string;nfields:number;recursiveFields:boolean[];recursiveFieldTypes?: (Term | null)[]}[]=[];

  decl.constructors.forEach((ctor,ctorIndex)=>{
    const rule=rulesInput?.[ctorIndex];
    let tail=ctor.type;const names=[...paramNames];
    for(let p=0;p<decl.numParams;p++){if(tail.tag!=="pi")throw new Error("internal parameterized recursor generator: constructor missing parameter");tail=tail.body;}
    const fieldBindings:NBinding[]=[],ihBindings:NBinding[]=[];const fieldVars:NTerm[]=[];let fieldIndex=0;
    const recursiveMask:boolean[]=[];
    while(tail.tag==="pi"){
      const currentFieldIndex=fieldIndex++;
      const fieldName=`a${ctorIndex}_${currentFieldIndex}`;
      const contextNames=[...names];
      fieldBindings.push({name:fieldName,domain:coreToNamed(tail.domain,names,allowTelescopeTerms),binderInfo:profile==="lean4331"?binderInfoOf(tail):"explicit"});
      fieldVars.push(v(fieldName));
      const isRec=!!rule?.recursiveFields[currentFieldIndex];recursiveMask.push(isRec);
      if(isRec){
        const recursiveType=rule?.recursiveFieldTypes?.[currentFieldIndex];
        ihBindings.push({
          name:`ih${ctorIndex}_${currentFieldIndex}`,
          domain:recursiveType
            ? recursiveIHType(recursiveType,v(fieldName),v("motive"),contextNames,allowTelescopeTerms)
            : app(v("motive"),v(fieldName)),
        });
      }
      names.push(fieldName);tail=tail.body;
    }
    const oldIH=[...ihBindings];let oldIHPos=0;const inner=fieldsFirstIHs?[...fieldBindings,...ihBindings]:fieldBindings.flatMap((b,i)=>recursiveMask[i]?[b,oldIH[oldIHPos++]]:[b]);
    const ctorApp=apps({tag:"const",name:ctor.name,levels:selfLevels},[...paramNames.map(v),...fieldVars]);
    outer.push({name:`minor${ctorIndex}`,domain:pis(inner,app(v("motive"),ctorApp))});
    rules.push({
      ctor:ctor.name,
      nfields:fieldVars.length,
      recursiveFields:rule?[...rule.recursiveFields]:fieldVars.map(()=>false),
      ...(rule?.recursiveFieldTypes?{recursiveFieldTypes:[...rule.recursiveFieldTypes]}:{}),
    });
  });

  outer.push({name:"major",domain:self});
  const type=lower(pis(outer,app(v("motive"),v("major"))));
  return{
    name:`${decl.name}.rec`,levelParams:motive.levelParams,type,
    metadata:{inductive:decl.name,numParams:decl.numParams,numIndices:0,numMinors:rules.length,rules},
  };
}

/** Generate Lean 4.33.1's special empty recursor shape.
 * All inductive parameters and indices become implicit recursor parameters;
 * the motive is explicit because there are no minor premises from which it can
 * be inferred, and it ranges only over the already-instantiated family.
 */
export function generateEmptyRecursor(
  decl: Extract<CoreDeclaration,{kind:"inductive"}>,
  allowTelescopeTerms=false,
  preserveFamilyBinderInfo=false,
): GeneratedRecursor {
  if(decl.constructors.length!==0)throw new Error("internal empty recursor generator: constructors must be empty");
  let motiveParam="u_motive",i=0;while(decl.levelParams.includes(motiveParam))motiveParam=`u_motive${++i}`;
  const selfLevels=decl.levelParams.map(levelParam);const motiveLevel=levelParam(motiveParam);
  const binders:NBinding[]=[];const names:string[]=[];let tail=decl.type;
  for(let j=0;j<decl.numParams+decl.numIndices;j++){
    if(tail.tag!=="pi")throw new Error("internal empty recursor generator: short inductive telescope");
    const name=j<decl.numParams?`p${j}`:`i${j-decl.numParams}`;
    binders.push({name,domain:coreToNamed(tail.domain,names,allowTelescopeTerms),binderInfo:preserveFamilyBinderInfo?recursorFamilyBinderInfo(binderInfoOf(tail)):"implicit"});names.push(name);tail=tail.body;
  }
  if(tail.tag!=="sort")throw new Error("internal empty recursor generator: result is not a sort");
  const self=apps({tag:"const",name:decl.name,levels:selfLevels},names.map(v));
  const motiveType:NTerm={tag:"pi",name:"major0",domain:self,body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"};
  const outer:NBinding[]=[...binders,{name:"motive",domain:motiveType,binderInfo:"explicit"},{name:"major",domain:self,binderInfo:"explicit"}];
  return{
    name:`${decl.name}.rec`,levelParams:[motiveParam,...decl.levelParams],type:lower(pis(outer,app(v("motive"),v("major")))),
    metadata:{inductive:decl.name,numParams:decl.numParams+decl.numIndices,numIndices:0,numMinors:0,rules:[]},
  };
}

/**
 * Generate an indexed recursor for the K1c slice where constructors have no
 * constructor-local fields after the uniform parameters. This is sufficient
 * for Eq-like singleton families while keeping recursive indexed fields out of
 * the trusted implementation until the next milestone.
 */
export function generateIndexedNoFieldRecursor(
  decl: Extract<CoreDeclaration,{kind:"inductive"}>,
  profile: RecursorGenerationProfile="legacy",
  motivePolicy:MotiveUniversePolicy="fresh",
  allowTelescopeTerms=false,
  preserveFamilyBinderInfo=false,
): GeneratedRecursor {
  const motive=motiveUniverse(decl,profile,motivePolicy);
  const selfLevels=decl.levelParams.map(levelParam);const motiveLevel=motive.level;

  const paramBindings:NBinding[]=[];const paramNames:string[]=[];
  const indexBindings:NBinding[]=[];const indexNames:string[]=[];
  let tail=decl.type;
  for(let p=0;p<decl.numParams;p++){
    if(tail.tag!=="pi")throw new Error("internal indexed recursor generator: short parameter telescope");
    const name=`p${p}`;paramBindings.push({name,domain:coreToNamed(tail.domain,paramNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(binderInfoOf(tail)):"implicit"):"explicit"});paramNames.push(name);tail=tail.body;
  }
  for(let x=0;x<decl.numIndices;x++){
    if(tail.tag!=="pi")throw new Error("internal indexed recursor generator: short index telescope");
    const name=`i${x}`;indexBindings.push({name,domain:coreToNamed(tail.domain,[...paramNames,...indexNames],allowTelescopeTerms),binderInfo:profile==="lean4331"?binderInfoOf(tail):"explicit"});indexNames.push(name);tail=tail.body;
  }

  const selfAt=(indices:NTerm[]):NTerm=>apps({tag:"const",name:decl.name,levels:selfLevels},[...paramNames.map(v),...indices]);
  const motiveType=pis(indexBindings,{tag:"pi",name:"major0",domain:selfAt(indexNames.map(v)),body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"});
  const outer:NBinding[]=[...paramBindings,{name:"motive",domain:motiveType,binderInfo:motiveBinderInfo(profile,decl.constructors.length)}];

  for(let c=0;c<decl.constructors.length;c++){
    const ctor=decl.constructors[c];let ctorTail=ctor.type;const ctorParamNames:string[]=[];
    for(let p=0;p<decl.numParams;p++){
      if(ctorTail.tag!=="pi")throw new Error("internal indexed recursor generator: constructor missing parameter");
      ctorParamNames.push(paramNames[p]);ctorTail=ctorTail.body;
    }
    if(ctorTail.tag==="pi")throw new Error("internal indexed recursor generator: constructor-local fields are unsupported");
    const {head,args}=flattenCoreApps(ctorTail);
    if(head.tag!=="const"||head.name!==decl.name)throw new Error("internal indexed recursor generator: bad constructor result");
    const indexArgs=args.slice(decl.numParams).map(a=>coreToNamed(a,paramNames,allowTelescopeTerms));
    const ctorApp=apps({tag:"const",name:ctor.name,levels:selfLevels},paramNames.map(v));
    const minorType=apps(v("motive"),[...indexArgs,ctorApp]);
    outer.push({name:`minor${c}`,domain:minorType});
  }

  outer.push(...indexBindings.map(b=>({...b,binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(b.binderInfo??"explicit"):"implicit"):b.binderInfo})));
  outer.push({name:"major",domain:selfAt(indexNames.map(v))});
  const result=apps(v("motive"),[...indexNames.map(v),v("major")]);
  return{
    name:`${decl.name}.rec`,levelParams:motive.levelParams,type:lower(pis(outer,result)),
    metadata:{inductive:decl.name,numParams:decl.numParams,numIndices:decl.numIndices,numMinors:decl.constructors.length,rules:decl.constructors.map(c=>({ctor:c.name,nfields:0,recursiveFields:[]}))},
  };
}


/**
 * v17 first recursive indexed recursor slice. Constructor-local fields are
 * supported, but recursive indexed fields must be direct family applications
 * (higher-order indexed recursion remains explicit unsupported).
 */
export function generateIndexedRecursiveRecursor(
  decl: Extract<CoreDeclaration,{kind:"inductive"}>,
  rulesInput: SimpleCtorRule[],
  profile: RecursorGenerationProfile="legacy",
  motivePolicy:MotiveUniversePolicy="fresh",
  allowTelescopeTerms=false,
  fieldsFirstIHs=false,
  preserveFamilyBinderInfo=false,
): GeneratedRecursor {
  if(decl.numIndices<=0)throw new Error("internal recursive indexed recursor generator: expected at least one index");
  if(rulesInput.length!==decl.constructors.length)throw new Error("internal recursive indexed recursor generator: rule count mismatch");
  const motive=motiveUniverse(decl,profile,motivePolicy);
  const selfLevels=decl.levelParams.map(levelParam),motiveLevel=motive.level;

  const paramBindings:NBinding[]=[],paramNames:string[]=[];
  const indexBindings:NBinding[]=[],indexNames:string[]=[];
  let typeTail=decl.type;
  for(let p=0;p<decl.numParams;p++){
    if(typeTail.tag!=="pi")throw new Error("internal recursive indexed recursor generator: short parameter telescope");
    const name=`p${p}`;paramBindings.push({name,domain:coreToNamed(typeTail.domain,paramNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(binderInfoOf(typeTail)):"implicit"):"explicit"});paramNames.push(name);typeTail=typeTail.body;
  }
  for(let x=0;x<decl.numIndices;x++){
    if(typeTail.tag!=="pi")throw new Error("internal recursive indexed recursor generator: short index telescope");
    const name=`i${x}`;indexBindings.push({name,domain:coreToNamed(typeTail.domain,[...paramNames,...indexNames],allowTelescopeTerms),binderInfo:profile==="lean4331"?binderInfoOf(typeTail):"explicit"});indexNames.push(name);typeTail=typeTail.body;
  }
  if(typeTail.tag!=="sort")throw new Error("internal recursive indexed recursor generator: result is not a sort");
  const selfAt=(indices:NTerm[]):NTerm=>apps({tag:"const",name:decl.name,levels:selfLevels},[...paramNames.map(v),...indices]);
  const motiveType=pis(indexBindings,{tag:"pi",name:"major0",domain:selfAt(indexNames.map(v)),body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"});
  const outer:NBinding[]=[...paramBindings,{name:"motive",domain:motiveType,binderInfo:motiveBinderInfo(profile,decl.constructors.length)}];
  const rules:SimpleRecursorMetadata["rules"]=[];

  decl.constructors.forEach((ctor,ctorIndex)=>{
    const rule=rulesInput[ctorIndex];let tail=ctor.type;const names=[...paramNames];
    for(let p=0;p<decl.numParams;p++){if(tail.tag!=="pi")throw new Error("internal recursive indexed recursor generator: constructor missing parameter");tail=tail.body;}
    const fieldBindings:NBinding[]=[],ihBindings:NBinding[]=[],fieldVars:NTerm[]=[];let fieldIndex=0;const recursiveMask:boolean[]=[];
    while(tail.tag==="pi"){
      const idx=fieldIndex++,fieldName=`a${ctorIndex}_${idx}`;
      fieldBindings.push({name:fieldName,domain:coreToNamed(tail.domain,names,allowTelescopeTerms),binderInfo:profile==="lean4331"?binderInfoOf(tail):"explicit"});fieldVars.push(v(fieldName));
      const isRec=!!rule.recursiveFields[idx];recursiveMask.push(isRec);
      if(isRec){
        const ft=rule.recursiveFieldTypes?.[idx];if(!ft)throw new Error("internal recursive indexed recursor generator: missing recursive field type");
        ihBindings.push({
          name:`ih${ctorIndex}_${idx}`,
          domain:recursiveIndexedIHType(ft,v(fieldName),v("motive"),decl.name,decl.numParams,decl.numIndices,names,allowTelescopeTerms),
        });
      }
      names.push(fieldName);tail=tail.body;
    }
    const oldIH=[...ihBindings];let oldIHPos=0;const inner=fieldsFirstIHs?[...fieldBindings,...ihBindings]:fieldBindings.flatMap((b,i)=>recursiveMask[i]?[b,oldIH[oldIHPos++]]:[b]);
    const result=flattenCoreApps(tail);
    if(result.head.tag!=="const"||result.head.name!==decl.name)throw new Error("internal recursive indexed recursor generator: bad constructor result");
    const resultIndices=result.args.slice(decl.numParams).map(a=>coreToNamed(a,names,allowTelescopeTerms));
    const ctorApp=apps({tag:"const",name:ctor.name,levels:selfLevels},[...paramNames.map(v),...fieldVars]);
    outer.push({name:`minor${ctorIndex}`,domain:pis(inner,apps(v("motive"),[...resultIndices,ctorApp]))});
    rules.push({ctor:ctor.name,nfields:fieldVars.length,recursiveFields:[...rule.recursiveFields],...(rule.recursiveFieldTypes?{recursiveFieldTypes:[...rule.recursiveFieldTypes]}:{})});
  });

  outer.push(...indexBindings.map(b=>({...b,binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(b.binderInfo??"explicit"):"implicit"):b.binderInfo})));
  outer.push({name:"major",domain:selfAt(indexNames.map(v)),binderInfo:"explicit"});
  const result=apps(v("motive"),[...indexNames.map(v),v("major")]);
  return{name:`${decl.name}.rec`,levelParams:motive.levelParams,type:lower(pis(outer,result)),metadata:{inductive:decl.name,numParams:decl.numParams,numIndices:decl.numIndices,numMinors:rules.length,rules}};
}


/**
 * v24 bounded direct mutual recursor generator.
 *
 * This deliberately handles only a shared zero-parameter/index mutual block.
 * Every motive and every minor is shared by all generated recursors, exactly
 * matching Lean's mutual recursor family layout for this slice.
 */
export function generateDirectMutualRecursors(
  levelParams: string[],
  members: CoreMutualInductiveMember[],
  rulesByMember: SimpleCtorRule[][],
  profile: RecursorGenerationProfile="lean4331",
  allowTelescopeTerms=false,
  motivePolicy:MotiveUniversePolicy="fresh",
  fieldsFirstIHs=false,
  preserveFamilyBinderInfo=false,
): GeneratedRecursor[] {
  if(members.length<2)throw new Error("internal mutual recursor generator: expected at least two inductives");
  const numParams=members[0].numParams;
  if(members.some(m=>m.numParams!==numParams))throw new Error("internal mutual recursor generator: members must share parameters");
  if(rulesByMember.length!==members.length)throw new Error("internal mutual recursor generator: member/rule count mismatch");
  let motiveParam="u_motive",i=0;while(levelParams.includes(motiveParam))motiveParam=`u_motive${++i}`;
  const motiveLevel=motivePolicy==="prop"?LevelZero:levelParam(motiveParam),selfLevels=levelParams.map(levelParam);

  // Shared uniform recursor parameters are reconstructed from the first member.
  // Member-specific indices are deliberately not shared: Lean permits mutual
  // families with different index telescopes after common parameters.
  const paramBindings:NBinding[]=[],paramNames:string[]=[];
  let firstTail=members[0].type;
  for(let pi=0;pi<numParams;pi++){
    if(firstTail.tag!=="pi")throw new Error("internal mutual recursor generator: short shared parameter telescope");
    const name=`p${pi}`;
    paramBindings.push({name,domain:coreToNamed(firstTail.domain,paramNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(binderInfoOf(firstTail)):"implicit"):binderInfoOf(firstTail)});
    paramNames.push(name);firstTail=firstTail.body;
  }

  const indexBindingsByMember:NBinding[][]=[];
  const indexNamesByMember:string[][]=[];
  members.forEach((member,mi)=>{
    let tail=member.type;
    for(let pi=0;pi<numParams;pi++){if(tail.tag!=="pi")throw new Error("internal mutual recursor generator: short parameter telescope");tail=tail.body;}
    const bindings:NBinding[]=[],names:string[]=[];
    for(let xi=0;xi<member.numIndices;xi++){
      if(tail.tag!=="pi")throw new Error(`internal mutual recursor generator: short index telescope for ${member.name}`);
      const name=`i${mi}_${xi}`;
      bindings.push({name,domain:coreToNamed(tail.domain,[...paramNames,...names],allowTelescopeTerms),binderInfo:profile==="lean4331"?binderInfoOf(tail):"explicit"});
      names.push(name);tail=tail.body;
    }
    if(tail.tag!=="sort")throw new Error(`internal mutual recursor generator: ${member.name} result is not a sort`);
    indexBindingsByMember.push(bindings);indexNamesByMember.push(names);
  });

  const familyAt=(mi:number,indices:NTerm[]):NTerm=>apps({tag:"const",name:members[mi].name,levels:selfLevels},[...paramNames.map(v),...indices]);
  const motiveName=(index:number)=>`motive_${index}`;
  const totalMinors=members.reduce((n,m)=>n+m.constructors.length,0);
  const motiveBindings:NBinding[]=members.map((m,mi)=>({
    name:motiveName(mi),
    domain:pis(indexBindingsByMember[mi],{tag:"pi",name:`major_m${mi}`,domain:familyAt(mi,indexNamesByMember[mi].map(v)),body:{tag:"sort",level:motiveLevel},binderInfo:"explicit"}),
    binderInfo:motiveBinderInfo(profile,totalMinors),
  }));
  const memberIndex=new Map(members.map((m,index)=>[m.name,index] as const));
  const minorBindings:NBinding[]=[];
  let globalMinor=0;
  const metadataRulesByMember:SimpleRecursorMetadata["rules"][]=members.map(()=>[]);
  members.forEach((member,mi)=>{
    const rules=rulesByMember[mi];
    if(rules.length!==member.constructors.length)throw new Error("internal mutual recursor generator: constructor/rule count mismatch");
    member.constructors.forEach((ctor,ci)=>{
      const rule=rules[ci],fieldBindings:NBinding[]=[],ihBindings:NBinding[]=[],fieldVars:NTerm[]=[],fieldNames=[...paramNames];
      const recursiveMask:boolean[]=[];
      let ctorTail=ctor.type;
      for(let pi=0;pi<numParams;pi++){
        if(ctorTail.tag!=="pi")throw new Error("internal mutual recursor generator: constructor missing shared parameter");
        ctorTail=ctorTail.body;
      }
      rule.fields.forEach((field,fi)=>{
        if(ctorTail.tag!=="pi")throw new Error("internal mutual recursor generator: constructor field telescope shorter than checked rule");
        const fieldName=`a${globalMinor}_${fi}`;
        fieldBindings.push({name:fieldName,domain:coreToNamed(field,fieldNames,allowTelescopeTerms),binderInfo:profile==="lean4331"?rule.fieldBinderInfo[fi]:"explicit"});
        fieldVars.push(v(fieldName));
        const target=rule.recursiveTargets?.[fi]??null;recursiveMask.push(!!target);
        if(target){
          const ti=memberIndex.get(target);if(ti===undefined)throw new Error(`internal mutual recursor generator: unknown recursive target ${target}`);
          const ft=rule.recursiveFieldTypes?.[fi];if(!ft)throw new Error("internal mutual recursor generator: missing recursive field type");
          ihBindings.push({
            name:`ih${globalMinor}_${fi}`,
            domain:recursiveMutualIHType(ft,v(fieldName),v(motiveName(ti)),target,numParams,members[ti].numIndices,fieldNames,allowTelescopeTerms),
          });
        }
        fieldNames.push(fieldName);
        ctorTail=ctorTail.body;
      });
      const oldIH=[...ihBindings];let oldIHPos=0;const inner=fieldsFirstIHs?[...fieldBindings,...ihBindings]:fieldBindings.flatMap((b,i)=>recursiveMask[i]?[b,oldIH[oldIHPos++]]:[b]);
      const result=flattenNamedApps(coreToNamed(ctorTail,fieldNames,allowTelescopeTerms));
      if(result.head.tag!=="const"||result.head.name!==member.name||result.args.length!==numParams+member.numIndices)
        throw new Error("internal mutual indexed recursor generator: bad constructor result");
      const resultIndices=result.args.slice(numParams);
      const ctorApp=apps({tag:"const",name:ctor.name,levels:selfLevels},[...paramNames.map(v),...fieldVars]);
      minorBindings.push({name:`minor${globalMinor}`,domain:pis(inner,apps(v(motiveName(mi)),[...resultIndices,ctorApp]))});
      metadataRulesByMember[mi].push({
        ctor:ctor.name,nfields:rule.fields.length,recursiveFields:[...rule.recursiveFields],
        ...(rule.recursiveFieldTypes?{recursiveFieldTypes:[...rule.recursiveFieldTypes]}:{}),
        ...(rule.recursiveTargets?{recursiveTargets:[...rule.recursiveTargets]}:{}),minorIndex:globalMinor,
      });
      globalMinor++;
    });
  });
  const mutualMeta={
    inductives:members.map(m=>m.name),motiveCount:members.length,
    recursors:members.map(m=>`${m.name}.rec`),indexCounts:members.map(m=>m.numIndices),
  };
  return members.map((member,mi)=>{
    const currentIndexBindings=indexBindingsByMember[mi].map(b=>({...b,binderInfo:profile==="lean4331"?(preserveFamilyBinderInfo?recursorFamilyBinderInfo(b.binderInfo??"explicit"):"implicit"):b.binderInfo}));
    const currentIndexNames=indexNamesByMember[mi];
    const outer:NBinding[]=[...paramBindings,...motiveBindings,...minorBindings,...currentIndexBindings,{name:"major",domain:familyAt(mi,currentIndexNames.map(v)),binderInfo:"explicit"}];
    return{
      name:`${member.name}.rec`,levelParams:motivePolicy==="prop"?[...levelParams]:[motiveParam,...levelParams],
      type:lower(pis(outer,apps(v(motiveName(mi)),[...currentIndexNames.map(v),v("major")]))),
      metadata:{inductive:member.name,numParams,numIndices:member.numIndices,numMinors:totalMinors,rules:metadataRulesByMember[mi],mutual:mutualMeta},
    };
  });
}
