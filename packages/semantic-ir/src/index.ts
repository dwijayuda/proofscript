import { CheckSummary } from "@proofscript/kernel";
import {
  CURRENT_PRODUCT_PROFILE,
  CURRENT_PROOFSCRIPT_REFERENCE,
  CheckedModuleSnapshot,
} from "@proofscript/plugin-api";

export function toCheckedModuleSnapshot(summary: CheckSummary, sourcePath: string): CheckedModuleSnapshot {
  return deepFreeze({
    schema: 1,
    proofscriptReference: CURRENT_PROOFSCRIPT_REFERENCE,
    productProfile: CURRENT_PRODUCT_PROFILE,
    coreCompatibility: {
      proofscriptReference: "v0.1",
      leanSemanticBaseline: "lean-4.33.1",
      implementationProfile: "K3c-section-vars0",
    },
    // Plugin API v1 compatibility aliases. New consumers should use coreCompatibility.
    semanticBaseline: "lean-4.33.1",
    implementationProfile: "K3c-section-vars0",
    declarations: summary.declarations,
    assumptions: summary.assumptions,
    sourcePath,
  } satisfies CheckedModuleSnapshot);
}

function deepFreeze<T>(x: T): T {
  if (x && typeof x === "object") {
    Object.freeze(x);
    for (const v of Object.values(x as any)) deepFreeze(v);
  }
  return x;
}
