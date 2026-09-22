import { Term } from "./Expr";

export function forEachExprV(term: Term, visit: (term: Term) => void): void {
  visit(term);
  switch (term.tag) {
    case "app": forEachExprV(term.fn, visit); forEachExprV(term.arg, visit); break;
    case "lam":
    case "pi": forEachExprV(term.domain, visit); forEachExprV(term.body, visit); break;
    case "let": forEachExprV(term.type, visit); forEachExprV(term.value, visit); forEachExprV(term.body, visit); break;
    case "proj": forEachExprV(term.expr, visit); break;
    case "sort":
    case "bvar":
    case "const": break;
  }
}

export const portStatus_PSKernel_ForEachExprV = {
  source: "PSKernel/ForEachExprV.lean",
  target: "packages/kernel/src/PSKernel/ForEachExprV.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
