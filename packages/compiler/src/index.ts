import crypto from "node:crypto";
import { type CheckSummary } from "@proofscript/kernel";
import { type BackendPlugin, type BackendResult } from "@proofscript/plugin-api";
import { toCheckedModuleSnapshot } from "@proofscript/semantic-ir";
import {
  checkProjectFile as checkProjectFileFrontend,
  checkSource as checkSourceFrontend,
  type FrontendOptions,
  type FrontendProjectResult,
  type FrontendResult,
} from "@proofscript/frontend";

/**
 * Canonical high-level source check for an already-loaded ProofScript source unit.
 *
 * This facade deliberately delegates semantics to @proofscript/frontend. Consumers
 * such as the CLI and future language service should depend on @proofscript/compiler
 * rather than wiring parser/elaborator/kernel packages themselves.
 */
export function checkSource(source: string, options: FrontendOptions = {}): FrontendResult {
  return checkSourceFrontend(source, options);
}

/**
 * Canonical high-level project/module check.
 */
export function checkProjectFile(entryFile: string, options: FrontendOptions = {}): FrontendProjectResult {
  return checkProjectFileFrontend(entryFile, options);
}


export interface CheckedModuleSnapshot {
  readonly module: string;
  readonly filePath: string;
  readonly sourceSha256: string;
  readonly imports: readonly string[];
  readonly declarations: readonly string[];
  /**
   * Hash of the module's checked Core declarations plus typeclass metadata.
   * This is deliberately conservative: body-only changes invalidate dependents.
   * A later public/private interface model may reduce unnecessary rebuilds.
   */
  readonly checkedSemanticSha256: string;
  /** Conservative dependency interface: currently identical to checkedSemanticSha256. */
  readonly dependencyInterfaceSha256: string;
}

export interface CheckedProjectSnapshot {
  readonly schema: "proofscript.checked-project/v1";
  readonly entry: string;
  readonly modules: readonly CheckedModuleSnapshot[];
  /** Machine/path-independent digest of the checked module graph. */
  readonly projectSha256: string;
}

export interface CheckedProjectResult {
  readonly project: FrontendProjectResult;
  readonly snapshot: CheckedProjectSnapshot;
}

/**
 * Derive a deterministic incremental identity from already checked canonical
 * frontend results. This never adds proof authority and never trusts backend IR.
 */
export function createCheckedProjectSnapshot(project: FrontendProjectResult): CheckedProjectSnapshot {
  const modules: CheckedModuleSnapshot[] = project.modules.map((module) => {
    const checkedSemanticSha256 = sha256(stableJson({
      declarations: module.declarations,
      typeclasses: module.typeclasses,
    }));
    return {
      module: module.source.name,
      filePath: module.source.filePath,
      sourceSha256: module.source.sourceSha256,
      imports: [...module.source.imports],
      declarations: module.declarations.map((declaration) => declaration.name),
      checkedSemanticSha256,
      dependencyInterfaceSha256: checkedSemanticSha256,
    };
  });

  const projectSha256 = sha256(stableJson({
    schema: "proofscript.checked-project/v1",
    entry: project.graph.entry,
    modules: modules.map(({ filePath: _filePath, ...module }) => module),
  }));

  return {
    schema: "proofscript.checked-project/v1",
    entry: project.graph.entry,
    modules,
    projectSha256,
  };
}

/** Check a project and return both the canonical result and deterministic checked snapshot. */
export function checkProjectSnapshot(entryFile: string, options: FrontendOptions = {}): CheckedProjectResult {
  const project = checkProjectFileFrontend(entryFile, options);
  return { project, snapshot: createCheckedProjectSnapshot(project) };
}

/**
 * Dispatch a checked semantic snapshot to a runtime/backend plugin.
 *
 * Backend success is an execution artifact claim only; it does not add logical
 * acceptance or prove runtime correspondence.
 */
export async function runBackend(
  backend: BackendPlugin,
  summary: CheckSummary,
  sourcePath: string,
  outPath: string,
): Promise<BackendResult> {
  return backend.build({ module: toCheckedModuleSnapshot(summary, sourcePath), outPath });
}

export type {
  FrontendOptions,
  FrontendProjectResult,
  FrontendResult,
};

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      const item = input[key];
      if (item !== undefined) output[key] = stableValue(item);
    }
    return output;
  }
  return value;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
