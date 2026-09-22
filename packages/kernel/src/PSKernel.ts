export * from "./PSKernel/Name";
export * from "./PSKernel/KernelError";
export * from "./PSKernel/Level";
export * from "./PSKernel/Expr";
export * from "./PSKernel/Declaration";
export * from "./PSKernel/LocalContext";
export * from "./PSKernel/FuelConfig";
export * from "./PSKernel/Environment/Basic";
export * from "./PSKernel/Environment";
export * from "./PSKernel/EquivManager";
export * from "./PSKernel/TypeChecker";
export * from "./PSKernel/Instantiate";
export * from "./PSKernel/ForEachExprV";
export * from "./PSKernel/List";
export * from "./PSKernel/PtrEq";
export * from "./PSKernel/Primitive";
export * from "./PSKernel/Quot";
export * from "./PSKernel/Replay";

export const portStatus_PSKernel = {
  source: "PSKernel.lean",
  target: "packages/kernel/src/PSKernel.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
  trustLabel: "pskernel-derived trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet",
} as const;
export * from "./PSKernel/Inductive/Add";
export * from "./PSKernel/Inductive/Reduce";

export * from "./PSKernel/Verify/Obligations";

export const pskernelKernelPortStatus = portStatus_PSKernel;
