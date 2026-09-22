export function nodup<T>(items: readonly T[]): boolean { return new Set(items).size === items.length; }
export function eraseDups<T>(items: readonly T[]): T[] { return [...new Set(items)]; }

export const portStatus_PSKernel_List = {
  source: "PSKernel/List.lean",
  target: "packages/kernel/src/PSKernel/List.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
