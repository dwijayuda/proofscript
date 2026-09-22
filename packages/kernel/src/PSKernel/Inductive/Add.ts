import { CoreDeclaration } from "../Declaration";
import { Environment, checkAndAddDeclaration } from "../Environment";

export function checkInductive(env: Environment, decl: Extract<CoreDeclaration, { kind: "inductive" | "mutualInductive" }>) {
  return checkAndAddDeclaration(env, decl);
}

export const portStatus_PSKernel_Inductive_Add = {
  source: "PSKernel/Inductive/Add.lean",
  target: "packages/kernel/src/PSKernel/Inductive/Add.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
