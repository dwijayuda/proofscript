export const PLUGIN_API_VERSION=1 as const;
export type PluginKind="backend"|"oracle"|"tooling"|"syntax"|"macro"|"elaborator"|"tactic"|"library"|"verification";
export type LogicalContribution="none"|"checked-declarations"|"axiom-bearing"|"unsafe-runtime";
export interface PluginManifest { name:string; version:string; pluginApi:1; proofscriptReference:"v0.1"; semanticBaseline:"lean-4.33.1"; kinds:PluginKind[]; requiresHostCapabilities?:string[]; logicalContribution:LogicalContribution; }
export interface CheckedDeclarationSnapshot { name:string; kind:string; type:string; assumptions:readonly string[]; }
export interface CheckedModuleSnapshot { schema:1; proofscriptReference:"v0.1"; semanticBaseline:"lean-4.33.1"; implementationProfile:"K3c-section-vars0"; declarations:readonly CheckedDeclarationSnapshot[]; assumptions:readonly string[]; sourcePath:string; }
export interface BackendInput { module:CheckedModuleSnapshot; outPath:string; }
export interface BackendResult { target:string; files:string[]; executionCorrespondence:"not-claimed"|"tested"|"verified"; }
export interface BackendPlugin { name:string; build(input:BackendInput):Promise<BackendResult>|BackendResult; }
export interface OracleInput { artifact:unknown; }
export interface OracleResult { status:"accepted"|"rejected"|"unsupported"|"resource_exhausted"|"implementation_error"; oracle:string; message:string; details?:Record<string,unknown>; }
export interface OraclePlugin { name:string; verify(input:OracleInput):Promise<OracleResult>|OracleResult; }
export interface PluginAPI { registerBackend(backend:BackendPlugin):void; registerOracle(oracle:OraclePlugin):void; }
export interface ProofScriptPlugin { manifest:PluginManifest; setup(api:PluginAPI,options?:unknown):void|Promise<void>; }
