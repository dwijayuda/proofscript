import {SurfaceTerm} from "@proofscript/syntax";

export function makeGlobalName(name:string):SurfaceTerm{
  return {tag:"name",name,namespacePath:[],openNamespaces:[]};
}

export function makeApp(fn:SurfaceTerm,args:SurfaceTerm[],explicit?:boolean):SurfaceTerm{
  return explicit===undefined?{tag:"app",fn,args}:{tag:"app",fn,args,explicit};
}

export function makeBinaryOp(op:"add"|"sub"|"mul"|"beq"|"lt"|"le"|"gt"|"ge",left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return {tag:"binaryOp",op,left,right};
}

export function makeNatAdd(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.add"),[left,right]);
}

export function makeNatMul(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.mul"),[left,right]);
}

export function makeNatSub(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.sub"),[left,right]);
}

export function makeNatBeq(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.beq"),[left,right]);
}

export function makeNatLeb(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.leb"),[left,right]);
}

export function makeNatLtb(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Nat.ltb"),[left,right]);
}

export function makeBoolIf(condition:SurfaceTerm,thenBranch:SurfaceTerm,elseBranch:SurfaceTerm):SurfaceTerm{
  return {tag:"bif",condition,thenBranch,elseBranch};
}

export function makeBoolNot(value:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Bool.not"),[value]);
}

export function makeBoolXor(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeApp(makeGlobalName("Bool.xor"),[left,right]);
}

export function makeBoolAnd(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeBoolIf(left,right,{tag:"boolLit",value:false});
}

export function makeBoolOr(left:SurfaceTerm,right:SurfaceTerm):SurfaceTerm{
  return makeBoolIf(left,{tag:"boolLit",value:true},right);
}
