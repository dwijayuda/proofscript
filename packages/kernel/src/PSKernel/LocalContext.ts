import { BinderInfo, Term } from "./Expr";
import { Name } from "./Name";

/** Type and optional let value are expressed in the context before this entry. */
export interface LocalDecl { name: Name; type: Term; binderInfo: BinderInfo; value?: Term; }
export type LocalContext = LocalDecl[];
export const emptyLocalContext = (): LocalContext => [];
export function extendLocalContext(ctx: LocalContext, type: Term, name: Name = "_", binderInfo: BinderInfo = "explicit"): LocalContext {
  return [...ctx, { name, type, binderInfo }];
}
export function extendLocalDefinition(ctx: LocalContext, type: Term, value: Term, name: Name = "_"): LocalContext {
  return [...ctx, { name, type, value, binderInfo: "explicit" }];
}
export function lookupBVarDecl(ctx: LocalContext, index: number): LocalDecl | undefined {
  if (!Number.isSafeInteger(index) || index < 0) return undefined;
  return ctx[ctx.length - 1 - index];
}
export function lookupBVar(ctx: LocalContext, index: number): Term | undefined {
  return lookupBVarDecl(ctx, index)?.type;
}

export const portStatus_PSKernel_LocalContext = {
  source: "PSKernel/LocalContext.lean",
  target: "packages/kernel/src/PSKernel/LocalContext.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
