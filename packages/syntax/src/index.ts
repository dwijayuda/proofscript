export class ParseError extends Error {}
export class UnsupportedFeature extends Error {}
export class ElaborationError extends Error {}
export class ResourceExhausted extends Error {}

export type Token={kind:"id"|"num"|"str"|"sym"|"eof";text:string;offset:number};

export type BinderInfo="explicit"|"implicit"|"strictImplicit"|"instImplicit";

export const SURFACE_FEATURE_IDS = [
  "D-CALL",
  "D-EXPLICIT-PARAMS",
  "D-DECL-SEMI",
  "D-CONST-ALIAS",
  "D-FUNCTION-ALIAS",
  "E-IF-BRACE",
  "E-STRUCT-BODY",
  "E-CLASS-BODY",
  "E-INDUCTIVE-BODY",
  "E-MATCH-BODY",
  "E-WHERE-BODY",
] as const;

export type SurfaceFeatureId = (typeof SURFACE_FEATURE_IDS)[number];
export interface SurfaceFeatureUse{feature:SurfaceFeatureId;startOffset:number;endOffset:number;}

export type SurfaceLevel=
  |{tag:"zero"}
  |{tag:"succ";of:SurfaceLevel}
  |{tag:"max";left:SurfaceLevel;right:SurfaceLevel}
  |{tag:"imax";left:SurfaceLevel;right:SurfaceLevel}
  |{tag:"param";name:string};

export type SurfacePattern=
  |{tag:"ctor";ctor:string;binders:string[];namespacePath?:string[];openNamespaces?:string[]}
  |{tag:"wildcard"}
  |{tag:"natZero"}
  |{tag:"natLit";value:number};
export interface SurfaceMatchCase{pattern:SurfacePattern;body:SurfaceTerm;}
export interface SurfaceEquationClause{pattern:SurfacePattern;body:SurfaceTerm;}
export interface SurfaceDoBind{name:string;value:SurfaceTerm;}
export interface SurfaceProofSpan{sourceStartOffset?:number;sourceEndOffset?:number;}
export interface SurfaceProofBranch extends SurfaceProofSpan{constructor:string;binders:string[];body:SurfaceTerm;}

export type SurfaceTerm=
  |{tag:"name";name:string;levels?:SurfaceLevel[];namespacePath?:string[];openNamespaces?:string[];sourceStartOffset?:number;sourceEndOffset?:number}
  |{tag:"sort";level:SurfaceLevel}
  |{tag:"natLit";value:number}
  |{tag:"intLit";value:number}
  |{tag:"stringLit";value:string}
  |{tag:"arrayLit";items:SurfaceTerm[]}
  |{tag:"tuple";items:SurfaceTerm[]}
  |{tag:"do";binds:SurfaceDoBind[];body:SurfaceTerm}
  |{tag:"boolLit";value:boolean}
  |{tag:"bif";condition:SurfaceTerm;thenBranch:SurfaceTerm;elseBranch:SurfaceTerm}
  |(SurfaceProofSpan&{tag:"rflProof"})
  |(SurfaceProofSpan&{tag:"exactProof";term:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"assumptionProof"})
  |(SurfaceProofSpan&{tag:"applyProof";term:SurfaceTerm;body?:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"introProof";names:string[];body:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"showProof";type:SurfaceTerm;body:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"haveProof";name:string;type?:SurfaceTerm;value:SurfaceTerm;body:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"rwProof";equality:SurfaceTerm;reverse:boolean;body:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"substProof";name:string;body:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"constructorProof";body?:SurfaceTerm})
  |(SurfaceProofSpan&{tag:"casesProof";term:SurfaceTerm;body?:SurfaceTerm;branches?:SurfaceProofBranch[]})
  |(SurfaceProofSpan&{tag:"inductionProof";term:SurfaceTerm;body?:SurfaceTerm;branches?:SurfaceProofBranch[]})
  |(SurfaceProofSpan&{tag:"simpProof"})
  |{tag:"eq";left:SurfaceTerm;right:SurfaceTerm}
  |{tag:"binaryOp";op:"add"|"sub"|"mul"|"beq"|"lt"|"le"|"gt"|"ge";left:SurfaceTerm;right:SurfaceTerm}
  |{tag:"app";fn:SurfaceTerm;args:SurfaceTerm[];explicit?:boolean}
  |{tag:"lam";binders:SurfaceLambdaBinder[];body:SurfaceTerm}
  |{tag:"pi";binder:SurfaceBinder;body:SurfaceTerm}
  |{tag:"let";name:string;type?:SurfaceTerm;value:SurfaceTerm;body:SurfaceTerm;nondep:boolean}
  |{tag:"match";scrutinee:SurfaceTerm;cases:SurfaceMatchCase[]}
  |{tag:"structInst";fields:SurfaceStructInstField[]}
  |{tag:"structUpdate";base:SurfaceTerm;fields:SurfaceStructInstField[]};

export type SurfaceBinder={name:string;type:SurfaceTerm;binderInfo?:BinderInfo};
export type SurfaceLambdaBinder={name:string;type?:SurfaceTerm;binderInfo?:BinderInfo};
export interface SurfaceDeclBase{name:string;availableLevels:string[];namespacePath?:string[];}
export interface SurfaceValueDeclBase extends SurfaceDeclBase{binders:SurfaceBinder[];type:SurfaceTerm;}
export interface SurfaceConstructor{name:string;binders:SurfaceBinder[];result?:SurfaceTerm;}
export interface SurfaceStructureField{name:string;type:SurfaceTerm;binderInfo?:BinderInfo;}
export interface SurfaceStructInstField{name:string;value:SurfaceTerm;}
export type SurfaceDeclaration=
  |(SurfaceValueDeclBase&{kind:"theorem";value:SurfaceTerm})
  |(SurfaceValueDeclBase&{kind:"axiom"})
  |(SurfaceValueDeclBase&{kind:"definition";value:SurfaceTerm})
  |(SurfaceValueDeclBase&{kind:"equationDefinition";equations:SurfaceEquationClause[]})
  |(SurfaceValueDeclBase&{kind:"abbrev";value:SurfaceTerm})
  |(SurfaceValueDeclBase&{kind:"opaque";value:SurfaceTerm})
  |(SurfaceValueDeclBase&{kind:"example";value:SurfaceTerm})
  |(SurfaceDeclBase&{kind:"inductive";params:SurfaceBinder[];type:SurfaceTerm;constructors:SurfaceConstructor[]})
  |(SurfaceDeclBase&{kind:"structure";fields:SurfaceStructureField[]})
  |(SurfaceDeclBase&{kind:"class";params:SurfaceBinder[];fields:SurfaceStructureField[]})
  |(SurfaceDeclBase&{kind:"instance";binders:SurfaceBinder[];type:SurfaceTerm;value:SurfaceTerm;priority:number;anonymous:boolean});
