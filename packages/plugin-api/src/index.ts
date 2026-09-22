export const PLUGIN_API_VERSION = 1 as const;
export const CURRENT_PROOFSCRIPT_REFERENCE = "v0.6.1" as const;
export const CURRENT_PRODUCT_PROFILE = "ps1-v061" as const;

export type PluginKind =
  | "backend"
  | "oracle"
  | "tooling"
  | "syntax"
  | "macro"
  | "elaborator"
  | "tactic"
  | "library"
  | "verification";

export type LogicalContribution =
  | "none"
  | "checked-declarations"
  | "axiom-bearing"
  | "unsafe-runtime";

interface PluginManifestBase {
  name: string;
  version: string;
  pluginApi: 1;
  kinds: PluginKind[];
  requiresHostCapabilities?: string[];
  logicalContribution: LogicalContribution;
}

/** Current product-facing manifest for Plugin API v1. */
export interface CurrentPluginManifest extends PluginManifestBase {
  proofscriptReference: typeof CURRENT_PROOFSCRIPT_REFERENCE;
  productProfile: typeof CURRENT_PRODUCT_PROFILE;
  /** Optional compatibility declaration for a plugin tied to a particular Core/Lean lane. */
  coreCompatibility?: {
    proofscriptReference?: string;
    leanSemanticBaseline?: string;
    implementationProfile?: string;
  };
}

/**
 * Legacy Plugin API v1 manifest.
 *
 * Kept readable by the host so old plugins do not break merely because product
 * metadata was separated from historical Core/Lean compatibility metadata.
 */
export interface LegacyPluginManifest extends PluginManifestBase {
  proofscriptReference: "v0.1";
  semanticBaseline: "lean-4.33.1";
}

export type PluginManifest = CurrentPluginManifest | LegacyPluginManifest;

export interface CheckedDeclarationSnapshot {
  name: string;
  kind: string;
  type: string;
  assumptions: readonly string[];
}

export interface CheckedModuleSnapshot {
  schema: 1;
  proofscriptReference: typeof CURRENT_PROOFSCRIPT_REFERENCE;
  productProfile: typeof CURRENT_PRODUCT_PROFILE;
  coreCompatibility: {
    proofscriptReference: "v0.1";
    leanSemanticBaseline: "lean-4.33.1";
    implementationProfile: "K3c-section-vars0";
  };
  /** @deprecated Plugin API v1 compatibility alias; use coreCompatibility.leanSemanticBaseline. */
  semanticBaseline: "lean-4.33.1";
  /** @deprecated Plugin API v1 compatibility alias; use coreCompatibility.implementationProfile. */
  implementationProfile: "K3c-section-vars0";
  declarations: readonly CheckedDeclarationSnapshot[];
  assumptions: readonly string[];
  sourcePath: string;
}

export interface BackendInput {
  module: CheckedModuleSnapshot;
  outPath: string;
}

export interface BackendResult {
  target: string;
  files: string[];
  executionCorrespondence: "not-claimed" | "tested" | "verified";
}

export interface BackendPlugin {
  name: string;
  build(input: BackendInput): Promise<BackendResult> | BackendResult;
}

export interface OracleInput {
  artifact: unknown;
}

export interface OracleResult {
  status: "accepted" | "rejected" | "unsupported" | "resource_exhausted" | "implementation_error";
  oracle: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface OraclePlugin {
  name: string;
  verify(input: OracleInput): Promise<OracleResult> | OracleResult;
}

export interface PluginAPI {
  registerBackend(backend: BackendPlugin): void;
  registerOracle(oracle: OraclePlugin): void;
}

export interface ProofScriptPlugin {
  manifest: PluginManifest;
  setup(api: PluginAPI, options?: unknown): void | Promise<void>;
}
