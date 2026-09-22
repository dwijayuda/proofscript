export { instantiate, instantiateTermLevels } from "./Expr";
export { instantiateLevel as instantiateLevelParams } from "./Level";

export const portStatus_PSKernel_Instantiate = {
  source: "PSKernel/Instantiate.lean",
  target: "packages/kernel/src/PSKernel/Instantiate.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
