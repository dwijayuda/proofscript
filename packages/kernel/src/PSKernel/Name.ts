/** Lean-style hierarchical names used by the TypeScript pskernel mirror. */
export type Name = string;

export function mkName(name: string): Name {
  if (!name || !name.trim()) throw new Error("invalid Lean name: empty");
  return name;
}

export function nameToString(name: Name): string { return name; }

export function nameEq(a: Name, b: Name): boolean { return a === b; }

export function nameLt(a: Name, b: Name): boolean { return a < b; }

export const portStatus_PSKernel_Name = {
  source: "PSKernel/Verify/Name.lean",
  target: "packages/kernel/src/PSKernel/Name.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
