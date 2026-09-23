import crypto from "node:crypto";
import { loadStandardBootstrap } from "@proofscript/environment";
import { type CheckSummary } from "@proofscript/kernel";
import { type BackendPlugin, type BackendResult } from "@proofscript/plugin-api";
import { toCheckedModuleSnapshot } from "@proofscript/semantic-ir";
import {
  checkProjectFile as checkProjectFileFrontend,
  checkSource as checkSourceFrontend,
  checkWorkspace as checkWorkspaceFrontend,
  checkWorkspaceForFile as checkWorkspaceForFileFrontend,
  type FrontendModuleCacheEntry,
  type FrontendOptions,
  type FrontendProofState,
  type FrontendProofStateLocal,
  type FrontendProjectResult,
  type FrontendResult,
  type FrontendWorkspaceResult,
} from "@proofscript/frontend";

/**
 * Canonical high-level source check for an already-loaded ProofScript source unit.
 *
 * This facade deliberately delegates semantics to @proofscript/frontend. Consumers
 * such as the CLI and future language service should depend on @proofscript/compiler
 * rather than wiring parser/elaborator/kernel packages themselves.
 */
let cachedStandardPrelude: FrontendOptions["prelude"] | undefined;

/**
 * Add the checked standard bootstrap to a compiler request unless the caller
 * supplied an explicit prelude. Editor and product surfaces use this helper so
 * Nat/Bool/String/etc. resolve through the same canonical frontend as the CLI.
 */
export function withStandardPrelude(options: FrontendOptions = {}): FrontendOptions {
  if (options.prelude) return options;
  cachedStandardPrelude ??= loadStandardBootstrap().artifact;
  return { ...options, prelude: cachedStandardPrelude };
}

export function checkSource(source: string, options: FrontendOptions = {}): FrontendResult {
  return checkSourceFrontend(source, options);
}

/**
 * Canonical high-level project/module check.
 */
export function checkProjectFile(entryFile: string, options: FrontendOptions = {}): FrontendProjectResult {
  return checkProjectFileFrontend(entryFile, options);
}

/** Check all configured source modules for compiler-backed editor/workspace indexing. */
export function checkWorkspace(projectRoot: string, options: FrontendOptions = {}): FrontendWorkspaceResult {
  return checkWorkspaceFrontend(projectRoot, options);
}

export function checkWorkspaceForFile(filePath: string, options: FrontendOptions = {}): FrontendWorkspaceResult {
  return checkWorkspaceForFileFrontend(filePath, options);
}

/**
 * In-process incremental project checker over the canonical frontend.
 *
 * Cached modules are never trusted by source name alone: the frontend reuses an
 * entry only when both its source hash and the complete checked dependency
 * environment hash match. This remains a performance optimization, not a new
 * proof authority or alternate frontend.
 */
export class IncrementalCompilerSession {
  private readonly moduleCache = new Map<string, FrontendModuleCacheEntry>();

  checkProjectFile(entryFile: string, options: FrontendOptions = {}): FrontendProjectResult {
    const project = checkProjectFileFrontend(entryFile, { ...options, moduleCache: this.moduleCache });
    this.prune(project);
    return project;
  }

  checkProjectSnapshot(entryFile: string, options: FrontendOptions = {}): CheckedProjectResult {
    const project = this.checkProjectFile(entryFile, options);
    return { project, snapshot: createCheckedProjectSnapshot(project) };
  }

  checkWorkspace(projectRoot: string, options: FrontendOptions = {}): FrontendWorkspaceResult {
    const workspace = checkWorkspaceFrontend(projectRoot, { ...options, moduleCache: this.moduleCache });
    this.pruneNames(workspace.graph.modules.map((module) => module.name));
    return workspace;
  }

  checkWorkspaceForFile(filePath: string, options: FrontendOptions = {}): FrontendWorkspaceResult {
    const workspace = checkWorkspaceForFileFrontend(filePath, { ...options, moduleCache: this.moduleCache });
    this.pruneNames(workspace.graph.modules.map((module) => module.name));
    return workspace;
  }

  clear(): void {
    this.moduleCache.clear();
  }

  cachedModules(): readonly string[] {
    return [...this.moduleCache.keys()].sort();
  }

  private prune(project: FrontendProjectResult): void {
    this.pruneNames(project.graph.modules.map((module) => module.name));
  }

  private pruneNames(moduleNames: readonly string[]): void {
    const active = new Set(moduleNames);
    for (const name of this.moduleCache.keys()) if (!active.has(name)) this.moduleCache.delete(name);
  }
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
  FrontendModuleCacheEntry,
  FrontendOptions,
  FrontendProofState,
  FrontendProofStateLocal,
  FrontendProjectResult,
  FrontendResult,
  FrontendWorkspaceResult,
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
