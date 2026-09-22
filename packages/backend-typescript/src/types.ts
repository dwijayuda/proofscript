import type { Term } from "@proofscript/kernel";

export type RuntimeMode = "bundled" | "local" | "package";

export interface EmitJavaScriptOptions {
  sourceFile?: string;
  sourceText?: string;
  userDeclarationOffset?: number;
  /** TypeScript runtime strategy. JS output remains bundled CommonJS for psc run. */
  runtimeMode?: RuntimeMode;
  /** Import path for local runtime mode, defaulting to ./proofscript-runtime.js for NodeNext/ESM-compatible local output. */
  runtimeImportPath?: string;
}

export interface EmittedJavaScriptDeclaration {
  name: string;
  jsName: string;
  kind: string;
  arity: number;
  expr: string;
}

export interface SkippedJavaScriptDeclaration {
  name: string;
  kind: string;
  reason: string;
}

export interface EmitJavaScriptResult {
  js: string;
  emitted: EmittedJavaScriptDeclaration[];
  skipped: SkippedJavaScriptDeclaration[];
}

export interface EmitTypeScriptResult {
  ts: string;
  emitted: EmittedJavaScriptDeclaration[];
  skipped: SkippedJavaScriptDeclaration[];
  runtimeMode: RuntimeMode;
  runtimeTs?: string;
  runtimeImport?: string;
}

export interface ConstructorEmitInfo {
  owner: string;
  ctorIndex: number;
  /** Uniform type/value parameters erased at runtime before constructor fields. */
  paramArity: number;
  /** Runtime constructor payload field count after erased parameters. */
  arity: number;
}

export interface ProjectionEmitInfo {
  owner: string;
  /** Uniform type/value parameters erased at runtime before the structure/class value. */
  paramArity: number;
  fieldIndex: number;
}

export interface RecursorEmitInfo {
  owner: string;
  /** Uniform type/value parameters erased at runtime before motive/minors/major. */
  paramArity: number;
  /** Branch argument counts including generated IH arguments for recursive fields. */
  arities: readonly number[];
  /** Constructor field indices whose value is structurally recursive in the owner type. */
  recursiveFieldPositions: readonly (readonly number[])[];
}

export interface EmitContext {
  nameMap: ReadonlyMap<string, string>;
  constructors: ReadonlyMap<string, ConstructorEmitInfo>;
  projections: ReadonlyMap<string, ProjectionEmitInfo>;
  recursors: ReadonlyMap<string, RecursorEmitInfo>;
}

export type EmitTarget = "js" | "ts";

export interface PiShape {
  domains: Term[];
  codomain: Term;
}

export interface AppShape {
  head: Term;
  args: Term[];
}
