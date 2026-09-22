export function ptrEq<T>(left: T, right: T): boolean { return Object.is(left, right); }

export const portStatus_PSKernel_PtrEq = {
  source: "PSKernel/PtrEq.lean",
  target: "packages/kernel/src/PSKernel/PtrEq.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
