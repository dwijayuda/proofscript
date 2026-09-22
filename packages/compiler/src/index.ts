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
