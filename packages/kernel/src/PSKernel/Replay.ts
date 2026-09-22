import crypto = require("node:crypto");
import { CoreArtifact, CoreDeclaration, CorePreludeProfile } from "./Declaration";
import { Environment, KernelError, KernelResourceError, checkAndAddDeclaration } from "./Environment";
import { KernelDeclarationError } from "./KernelError";
import { pretty } from "./Expr";
import { installCorePrimitives } from "./Primitive";
import { proofObligationReport } from "./Verify/Obligations";

export type Status = "accepted" | "rejected" | "unsupported" | "resource_exhausted" | "implementation_error";
export interface EnvironmentSnapshot {
  format: "proofscript-environment-snapshot";
  version: 1;
  semanticBaseline: "Lean 4.33.1";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  label?: string;
  constants: { name: string; kind: string; levelParams: string[]; type?: string; quotKind?: string; metadata?: unknown }[];
  checkedDeclarations: { name: string; kind: string; levelParams: string[]; type?: string; generated: string[]; assumptions: string[]; metadata?: unknown }[];
  environmentSha256: string;
}

export interface SnapshotReplaySummary extends CheckSummary {
  environmentSnapshot?: EnvironmentSnapshot;
}

export interface CheckSummary {
  status: Status;
  declarations: { name: string; kind: string; universes: string[]; type: string; generated: string[]; assumptions: string[] }[];
  assumptions: string[];
  /** Deterministic primitive/base environment installed before artifact declarations. */
  prelude?: { profile: CorePreludeProfile; installed: string[] };
  /** Deterministic hash of the checked summary/prelude; evidence only, not a proof. */
  semanticSha256?: string;
  environmentSha256?: string;
  message?: string;
}

export interface CoreReplayCertificate {
  status: "accepted";
  proofStatus: "not-proven";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  semanticBaseline: "Lean 4.33.1";
  implementationProfile: string;
  /** Hash of the canonical serialized input artifact. Evidence only, not a signature or proof. */
  artifactSha256: string;
  /** Hash of the independently replayed checked semantic summary. Evidence only, not a proof. */
  semanticSha256: string;
  /** Hash of the final deterministic environment snapshot after replay. Evidence only, not a proof. */
  environmentSha256: string;
  declarations: string[];
  generated: string[];
  assumptions: string[];
  prelude?: { profile: CorePreludeProfile; installed: string[] };
}

export interface CoreReplayCertificateVerification {
  status: Status;
  proofStatus: "not-proven";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  semanticBaseline: "Lean 4.33.1";
  implementationProfile?: string;
  artifactSha256?: string;
  semanticSha256?: string;
  environmentSha256?: string;
  message?: string;
}

export interface CertifiedReplaySummary extends SnapshotReplaySummary {
  certificate?: CoreReplayCertificate;
}

export interface CoreReplayAuditBundle {
  status: Status;
  proofStatus: "not-proven";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  semanticBaseline: "Lean 4.33.1";
  implementationProfile?: string;
  replay: CheckSummary;
  certificate?: CoreReplayCertificate;
  certificateVerification?: CoreReplayCertificateVerification;
  obligations: ReturnType<typeof proofObligationReport>;
  obligationsSha256?: string;
  auditSha256?: string;
  message?: string;
}


export interface CoreReplayCertificateBundle {
  format: "proofscript-core-replay-certificate-bundle";
  version: 1;
  status: "accepted";
  proofStatus: "not-proven";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  semanticBaseline: "Lean 4.33.1";
  artifact: CoreArtifact;
  certificate: CoreReplayCertificate;
  certificateVerification: CoreReplayCertificateVerification & { status: "accepted" };
  environmentSnapshot: EnvironmentSnapshot;
  obligationsSha256: string;
  auditSha256: string;
  bundleSha256: string;
}

export interface CoreReplayCertificateBundleVerification {
  status: Status;
  proofStatus: "not-proven";
  trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet";
  semanticBaseline: "Lean 4.33.1";
  artifactSha256?: string;
  semanticSha256?: string;
  environmentSha256?: string;
  obligationsSha256?: string;
  auditSha256?: string;
  bundleSha256?: string;
  message?: string;
}

export type CoreReplayCertificateBundleResult = CoreReplayCertificateBundle | CoreReplayCertificateBundleVerification;


function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) throw new KernelDeclarationError(`${path} must be an object`);
  return value;
}

function expectName(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new KernelDeclarationError(`${path} must be a nonempty name`);
  return value;
}

function expectNameArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new KernelDeclarationError(`${path} must be an array of names`);
  return value.map((name, i) => expectName(name, `${path}[${i}]`));
}

function validateBinderInfo(value: unknown, path: string): void {
  if (value === undefined) return;
  if (value !== "explicit" && value !== "implicit" && value !== "strictImplicit" && value !== "instImplicit") {
    throw new KernelDeclarationError(`${path} has invalid binderInfo ${String(value)}`);
  }
}

function validateLevel(level: unknown, path: string): void {
  const obj = expectObject(level, path);
  switch (obj.tag) {
    case "zero": return;
    case "succ": return validateLevel(obj.of, `${path}.of`);
    case "max":
    case "imax":
      validateLevel(obj.left, `${path}.left`);
      validateLevel(obj.right, `${path}.right`);
      return;
    case "param":
    case "mvar":
      expectName(obj.name, `${path}.name`);
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid level tag ${String(obj.tag)}`);
  }
}

function validateTerm(term: unknown, path: string): void {
  const obj = expectObject(term, path);
  switch (obj.tag) {
    case "sort":
      validateLevel(obj.level, `${path}.level`);
      return;
    case "bvar":
      if (!Number.isSafeInteger(obj.index) || Number(obj.index) < 0) throw new KernelDeclarationError(`${path}.index must be a nonnegative safe integer`);
      return;
    case "const":
      expectName(obj.name, `${path}.name`);
      if (!Array.isArray(obj.levels)) throw new KernelDeclarationError(`${path}.levels must be an array`);
      obj.levels.forEach((level, i) => validateLevel(level, `${path}.levels[${i}]`));
      return;
    case "lit": {
      const literal = expectObject(obj.literal, `${path}.literal`);
      if (literal.tag === "nat") {
        if (!Number.isSafeInteger(literal.value) || Number(literal.value) < 0) throw new KernelDeclarationError(`${path}.literal.value must be a nonnegative safe integer Nat literal`);
        return;
      }
      if (literal.tag === "int") {
        if (!Number.isSafeInteger(literal.value)) throw new KernelDeclarationError(`${path}.literal.value must be a safe integer Int literal`);
        return;
      }
      if (literal.tag === "str") {
        if (typeof literal.value !== "string") throw new KernelDeclarationError(`${path}.literal.value must be a string`);
        return;
      }
      throw new KernelDeclarationError(`${path}.literal has invalid literal tag ${String(literal.tag)}`);
    }
    case "app":
      validateTerm(obj.fn, `${path}.fn`);
      validateTerm(obj.arg, `${path}.arg`);
      return;
    case "lam":
    case "pi":
      validateTerm(obj.domain, `${path}.domain`);
      validateTerm(obj.body, `${path}.body`);
      validateBinderInfo(obj.binderInfo, `${path}.binderInfo`);
      return;
    case "let":
      validateTerm(obj.type, `${path}.type`);
      validateTerm(obj.value, `${path}.value`);
      validateTerm(obj.body, `${path}.body`);
      if (typeof obj.nondep !== "boolean") throw new KernelDeclarationError(`${path}.nondep must be boolean`);
      return;
    case "proj":
      expectName(obj.typeName, `${path}.typeName`);
      if (!Number.isSafeInteger(obj.index) || Number(obj.index) < 0) throw new KernelDeclarationError(`${path}.index must be a nonnegative safe integer`);
      validateTerm(obj.expr, `${path}.expr`);
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid term tag ${String(obj.tag)}`);
  }
}

function validateConstructor(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectName(obj.name, `${path}.name`);
  validateTerm(obj.type, `${path}.type`);
}

function validateDeclaration(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  const kind = obj.kind;
  expectName(obj.name, `${path}.name`);
  expectNameArray(obj.levelParams, `${path}.levelParams`);
  switch (kind) {
    case "quot": return;
    case "axiom":
      validateTerm(obj.type, `${path}.type`);
      return;
    case "theorem":
    case "opaque":
    case "example":
      validateTerm(obj.type, `${path}.type`);
      validateTerm(obj.value, `${path}.value`);
      return;
    case "definition":
      validateTerm(obj.type, `${path}.type`);
      validateTerm(obj.value, `${path}.value`);
      if (obj.reducibility !== "regular" && obj.reducibility !== "abbrev") throw new KernelDeclarationError(`${path}.reducibility must be regular or abbrev`);
      return;
    case "inductive":
      validateTerm(obj.type, `${path}.type`);
      if (!Number.isSafeInteger(obj.numParams) || Number(obj.numParams) < 0) throw new KernelDeclarationError(`${path}.numParams must be a nonnegative safe integer`);
      if (!Number.isSafeInteger(obj.numIndices) || Number(obj.numIndices) < 0) throw new KernelDeclarationError(`${path}.numIndices must be a nonnegative safe integer`);
      if (!Array.isArray(obj.constructors)) throw new KernelDeclarationError(`${path}.constructors must be an array`);
      obj.constructors.forEach((ctor, i) => validateConstructor(ctor, `${path}.constructors[${i}]`));
      return;
    case "mutualInductive":
      if (!Array.isArray(obj.inductives)) throw new KernelDeclarationError(`${path}.inductives must be an array`);
      obj.inductives.forEach((ind, i) => {
        const iobj = expectObject(ind, `${path}.inductives[${i}]`);
        expectName(iobj.name, `${path}.inductives[${i}].name`);
        validateTerm(iobj.type, `${path}.inductives[${i}].type`);
        if (!Number.isSafeInteger(iobj.numParams) || Number(iobj.numParams) < 0) throw new KernelDeclarationError(`${path}.inductives[${i}].numParams must be a nonnegative safe integer`);
        if (!Number.isSafeInteger(iobj.numIndices) || Number(iobj.numIndices) < 0) throw new KernelDeclarationError(`${path}.inductives[${i}].numIndices must be a nonnegative safe integer`);
        if (!Array.isArray(iobj.constructors)) throw new KernelDeclarationError(`${path}.inductives[${i}].constructors must be an array`);
        iobj.constructors.forEach((ctor, j) => validateConstructor(ctor, `${path}.inductives[${i}].constructors[${j}]`));
      });
      return;
    default:
      throw new KernelDeclarationError(`${path} has invalid declaration kind ${String(kind)}`);
  }
}


function expectSafeNonnegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new KernelDeclarationError(`${path} must be a nonnegative safe integer`);
  return Number(value);
}

function validateTypeclassParam(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectName(obj.name, `${path}.name`);
  validateBinderInfo(obj.binderInfo, `${path}.binderInfo`);
}

function validateTypeclassField(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectName(obj.name, `${path}.name`);
  validateTerm(obj.type, `${path}.type`);
}

function validateTypeclassClass(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectName(obj.name, `${path}.name`);
  const numParams = expectSafeNonnegativeInteger(obj.numParams, `${path}.numParams`);
  expectSafeNonnegativeInteger(obj.declarationOrder, `${path}.declarationOrder`);
  if (!Array.isArray(obj.params)) throw new KernelDeclarationError(`${path}.params must be an array`);
  if (obj.params.length !== numParams) throw new KernelDeclarationError(`${path}.numParams must match params length`);
  if (!Array.isArray(obj.fields)) throw new KernelDeclarationError(`${path}.fields must be an array`);
  obj.params.forEach((param, i) => validateTypeclassParam(param, `${path}.params[${i}]`));
  obj.fields.forEach((field, i) => validateTypeclassField(field, `${path}.fields[${i}]`));
}

function validateTypeclassInstance(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectName(obj.name, `${path}.name`);
  expectName(obj.className, `${path}.className`);
  if (!Number.isSafeInteger(obj.priority)) throw new KernelDeclarationError(`${path}.priority must be a safe integer`);
  expectSafeNonnegativeInteger(obj.declarationOrder, `${path}.declarationOrder`);
  if (obj.scope !== "global") throw new KernelDeclarationError(`${path}.scope must be global`);
  if (typeof obj.anonymous !== "boolean") throw new KernelDeclarationError(`${path}.anonymous must be boolean`);
}

function validateTypeclassMetadata(typeclasses: Record<string, unknown>): void {
  if (!Array.isArray(typeclasses.classes) || !Array.isArray(typeclasses.instances)) {
    throw new KernelDeclarationError("core artifact typeclass metadata must contain classes and instances arrays");
  }
  const classNames = new Set<string>();
  typeclasses.classes.forEach((cls, i) => {
    const path = `core artifact typeclasses.classes[${i}]`;
    validateTypeclassClass(cls, path);
    const name = expectObject(cls, path).name as string;
    if (classNames.has(name)) throw new KernelDeclarationError(`${path}.name duplicates typeclass metadata entry ${name}`);
    classNames.add(name);
  });
  const instanceNames = new Set<string>();
  typeclasses.instances.forEach((inst, i) => {
    const path = `core artifact typeclasses.instances[${i}]`;
    validateTypeclassInstance(inst, path);
    const obj = expectObject(inst, path);
    const name = obj.name as string;
    const className = obj.className as string;
    if (instanceNames.has(name)) throw new KernelDeclarationError(`${path}.name duplicates typeclass instance metadata entry ${name}`);
    if (!classNames.has(className)) throw new KernelDeclarationError(`${path}.className references unknown typeclass metadata entry ${className}`);
    instanceNames.add(name);
  });
}


function expectNonemptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new KernelDeclarationError(`${path} must be a nonempty string`);
  return value;
}

function expectVersion(value: unknown, expected: number, path: string): void {
  if (value !== expected) throw new KernelDeclarationError(`${path} must be ${expected}`);
}

function validateStringArray(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new KernelDeclarationError(`${path} must be an array of strings`);
  value.forEach((entry, i) => expectNonemptyString(entry, `${path}[${i}]`));
}

function validateModuleImportMetadata(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectNonemptyString(obj.module, `${path}.module`);
  if (obj.mode !== "plain") throw new KernelDeclarationError(`${path}.mode must be plain`);
  expectNonemptyString(obj.interfaceSha256, `${path}.interfaceSha256`);
}

function validateModuleMetadata(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectNonemptyString(obj.name, `${path}.name`);
  expectNonemptyString(obj.sourceSha256, `${path}.sourceSha256`);
  if (!Array.isArray(obj.imports)) throw new KernelDeclarationError(`${path}.imports must be an array`);
  obj.imports.forEach((imp, i) => validateModuleImportMetadata(imp, `${path}.imports[${i}]`));
  validateStringArray(obj.declarations, `${path}.declarations`);
  validateStringArray(obj.exports, `${path}.exports`);
  expectNonemptyString(obj.interfaceSha256, `${path}.interfaceSha256`);
  expectNonemptyString(obj.cacheKeySha256, `${path}.cacheKeySha256`);
}

function validateModulesMetadata(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  expectNonemptyString(obj.entry, `${path}.entry`);
  expectVersion(obj.interfaceFormatVersion, 1, `${path}.interfaceFormatVersion`);
  expectVersion(obj.cacheKeyFormatVersion, 1, `${path}.cacheKeyFormatVersion`);
  expectNonemptyString(obj.baseEnvironmentSha256, `${path}.baseEnvironmentSha256`);
  if (!Array.isArray(obj.modules)) throw new KernelDeclarationError(`${path}.modules must be an array`);
  const moduleNames = new Set<string>();
  obj.modules.forEach((mod, i) => {
    const modulePath = `${path}.modules[${i}]`;
    validateModuleMetadata(mod, modulePath);
    const name = expectObject(mod, modulePath).name as string;
    if (moduleNames.has(name)) throw new KernelDeclarationError(`${modulePath}.name duplicates module metadata entry ${name}`);
    moduleNames.add(name);
  });
  if (!moduleNames.has(obj.entry as string)) throw new KernelDeclarationError(`${path}.entry must reference one of the serialized modules`);
}

export function validateCoreArtifact(artifact: CoreArtifact): void {
  const obj = expectObject(artifact, "core artifact");
  if (obj.format !== "proofscript-core") throw new KernelDeclarationError(`invalid core artifact format: ${String(obj.format)}`);
  if (obj.formatVersion !== 1) throw new KernelDeclarationError(`unsupported core artifact formatVersion: ${String(obj.formatVersion)}`);
  if (typeof obj.proofscriptReference !== "string" || obj.proofscriptReference.length === 0) throw new KernelDeclarationError("core artifact proofscriptReference must be a nonempty string");
  if (typeof obj.implementationProfile !== "string" || obj.implementationProfile.length === 0) throw new KernelDeclarationError("core artifact implementationProfile must be a nonempty string");
  if (obj.leanSemanticBaseline !== "4.33.1") throw new KernelDeclarationError(`unsupported Lean semantic baseline: ${String(obj.leanSemanticBaseline)}`);
  if (obj.prelude !== undefined && obj.prelude !== "none" && obj.prelude !== "core" && obj.prelude !== "core+quot") {
    throw new KernelDeclarationError(`unsupported core artifact prelude profile: ${String(obj.prelude)}`);
  }
  if (!Array.isArray(obj.declarations)) throw new KernelDeclarationError("core artifact declarations must be an array");
  const typeclasses = expectObject(obj.typeclasses, "core artifact typeclasses");
  validateTypeclassMetadata(typeclasses);
  if (obj.modules !== undefined) validateModulesMetadata(obj.modules, "core artifact modules");
  obj.declarations.forEach((decl, i) => validateDeclaration(decl, `core artifact declarations[${i}]`));
}

function expectSha256(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new KernelDeclarationError(`${path} must be a lowercase SHA-256 hex digest`);
  }
  return value;
}

function validatePreludeEvidence(value: unknown, path: string): void {
  const obj = expectObject(value, path);
  if (obj.profile !== "none" && obj.profile !== "core" && obj.profile !== "core+quot") {
    throw new KernelDeclarationError(`${path}.profile has unsupported prelude profile ${String(obj.profile)}`);
  }
  validateStringArray(obj.installed, `${path}.installed`);
}

export function validateCoreReplayCertificate(certificate: unknown): CoreReplayCertificate {
  const obj = expectObject(certificate, "core replay certificate");
  if (obj.status !== "accepted") throw new KernelDeclarationError("core replay certificate status must be accepted");
  if (obj.proofStatus !== "not-proven") throw new KernelDeclarationError("core replay certificate proofStatus must be not-proven");
  if (obj.trustLabel !== "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet") {
    throw new KernelDeclarationError("core replay certificate trustLabel does not match the trusted-boundary label");
  }
  if (obj.semanticBaseline !== "Lean 4.33.1") throw new KernelDeclarationError("core replay certificate semanticBaseline must be Lean 4.33.1");
  expectNonemptyString(obj.implementationProfile, "core replay certificate.implementationProfile");
  expectSha256(obj.artifactSha256, "core replay certificate.artifactSha256");
  expectSha256(obj.semanticSha256, "core replay certificate.semanticSha256");
  expectSha256(obj.environmentSha256, "core replay certificate.environmentSha256");
  validateStringArray(obj.declarations, "core replay certificate.declarations");
  validateStringArray(obj.generated, "core replay certificate.generated");
  validateStringArray(obj.assumptions, "core replay certificate.assumptions");
  if (obj.prelude !== undefined) validatePreludeEvidence(obj.prelude, "core replay certificate.prelude");
  return obj as unknown as CoreReplayCertificate;
}


function validateSnapshotEntryArray(value: unknown, path: string): void {
  if (!Array.isArray(value)) throw new KernelDeclarationError(`${path} must be an array`);
  for (const [i, entry] of value.entries()) {
    const obj = expectObject(entry, `${path}[${i}]`);
    expectName(obj.name, `${path}[${i}].name`);
    expectNonemptyString(obj.kind, `${path}[${i}].kind`);
    validateStringArray(obj.levelParams, `${path}[${i}].levelParams`);
    if (obj.type !== undefined) expectNonemptyString(obj.type, `${path}[${i}].type`);
    if (obj.generated !== undefined) validateStringArray(obj.generated, `${path}[${i}].generated`);
    if (obj.assumptions !== undefined) validateStringArray(obj.assumptions, `${path}[${i}].assumptions`);
    if (obj.quotKind !== undefined) expectNonemptyString(obj.quotKind, `${path}[${i}].quotKind`);
  }
}

export function validateEnvironmentSnapshot(snapshot: unknown): EnvironmentSnapshot {
  const obj = expectObject(snapshot, "environment snapshot");
  if (obj.format !== "proofscript-environment-snapshot") throw new KernelDeclarationError("environment snapshot format must be proofscript-environment-snapshot");
  if (obj.version !== 1) throw new KernelDeclarationError("environment snapshot version must be 1");
  if (obj.semanticBaseline !== "Lean 4.33.1") throw new KernelDeclarationError("environment snapshot semanticBaseline must be Lean 4.33.1");
  if (obj.trustLabel !== "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet") throw new KernelDeclarationError("environment snapshot trustLabel does not match trusted-boundary label");
  if (obj.label !== undefined) expectNonemptyString(obj.label, "environment snapshot.label");
  validateSnapshotEntryArray(obj.constants, "environment snapshot.constants");
  validateSnapshotEntryArray(obj.checkedDeclarations, "environment snapshot.checkedDeclarations");
  const supplied = expectSha256(obj.environmentSha256, "environment snapshot.environmentSha256");
  const withoutHash: Record<string, unknown> = { ...obj };
  delete withoutHash.environmentSha256;
  const expected = sha256Hex(withoutHash);
  if (supplied !== expected) throw new KernelDeclarationError("environment snapshot hash does not match canonical snapshot payload");
  return obj as unknown as EnvironmentSnapshot;
}

export function validateCoreReplayCertificateBundle(bundle: unknown): CoreReplayCertificateBundle {
  const obj = expectObject(bundle, "core replay certificate bundle");
  if (obj.format !== "proofscript-core-replay-certificate-bundle") throw new KernelDeclarationError("core replay certificate bundle format must be proofscript-core-replay-certificate-bundle");
  if (obj.version !== 1) throw new KernelDeclarationError("core replay certificate bundle version must be 1");
  if (obj.status !== "accepted") throw new KernelDeclarationError("core replay certificate bundle status must be accepted");
  if (obj.proofStatus !== "not-proven") throw new KernelDeclarationError("core replay certificate bundle proofStatus must be not-proven");
  if (obj.trustLabel !== "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet") throw new KernelDeclarationError("core replay certificate bundle trustLabel does not match trusted-boundary label");
  if (obj.semanticBaseline !== "Lean 4.33.1") throw new KernelDeclarationError("core replay certificate bundle semanticBaseline must be Lean 4.33.1");
  validateCoreArtifact(obj.artifact as CoreArtifact);
  validateCoreReplayCertificate(obj.certificate);
  const certificateVerification = expectObject(obj.certificateVerification, "core replay certificate bundle.certificateVerification");
  if (certificateVerification.status !== "accepted") throw new KernelDeclarationError("core replay certificate bundle.certificateVerification.status must be accepted");
  validateEnvironmentSnapshot(obj.environmentSnapshot);
  expectSha256(obj.obligationsSha256, "core replay certificate bundle.obligationsSha256");
  expectSha256(obj.auditSha256, "core replay certificate bundle.auditSha256");
  const suppliedBundleSha = expectSha256(obj.bundleSha256, "core replay certificate bundle.bundleSha256");
  const withoutHash: Record<string, unknown> = { ...obj };
  delete withoutHash.bundleSha256;
  const expectedBundleSha = sha256Hex(withoutHash);
  if (suppliedBundleSha !== expectedBundleSha) throw new KernelDeclarationError("core replay certificate bundle hash does not match canonical bundle payload");
  return obj as unknown as CoreReplayCertificateBundle;
}


function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableSha256(value: unknown): string {
  return sha256Hex(value);
}

function attachSemanticHash(summary: CheckSummary, implementationProfile?: string): CheckSummary {
  if (summary.status !== "accepted") return summary;
  const digestInput = {
    semanticBaseline: "Lean 4.33.1",
    implementationProfile: implementationProfile ?? "pskernel-ts-check-core",
    prelude: summary.prelude,
    declarations: summary.declarations,
    assumptions: summary.assumptions,
  };
  return { ...summary, semanticSha256: sha256Hex(digestInput) };
}


function sortByName<T extends { name: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

function constantInfoTypeString(info: ReturnType<Environment["constantInfos"]>[number]): string | undefined {
  return "type" in info && info.type ? pretty(info.type) : undefined;
}

function checkedDeclarationTypeString(declaration: ReturnType<Environment["all"]>[number]["declaration"]): string | undefined {
  return "type" in declaration && declaration.type ? pretty(declaration.type) : undefined;
}

function checkedDeclarationLevelParams(declaration: ReturnType<Environment["all"]>[number]["declaration"]): string[] {
  return "levelParams" in declaration && Array.isArray(declaration.levelParams) ? [...declaration.levelParams].sort() : [];
}

export function snapshotEnvironment(env: Environment, options: { label?: string } = {}): EnvironmentSnapshot {
  const withoutHash = {
    format: "proofscript-environment-snapshot" as const,
    version: 1 as const,
    semanticBaseline: "Lean 4.33.1" as const,
    trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet" as const,
    ...(options.label ? { label: options.label } : {}),
    constants: sortByName(env.constantInfos().map(info => ({
      name: info.name,
      kind: info.kind,
      levelParams: [...info.levelParams].sort(),
      ...(constantInfoTypeString(info) ? { type: constantInfoTypeString(info) } : {}),
      ...(info.kind === "quotInfo" && info.quotKind ? { quotKind: info.quotKind } : {}),
      ...(("metadata" in info && info.metadata !== undefined) ? { metadata: info.metadata } : {}),
    }))),
    checkedDeclarations: sortByName(env.all().map(entry => ({
      name: entry.declaration.name,
      kind: entry.declaration.kind,
      levelParams: checkedDeclarationLevelParams(entry.declaration),
      ...(checkedDeclarationTypeString(entry.declaration) ? { type: checkedDeclarationTypeString(entry.declaration) } : {}),
      generated: [...entry.generated].sort(),
      assumptions: [...entry.assumptions].sort(),
      ...(("metadata" in entry.declaration && entry.declaration.metadata !== undefined) ? { metadata: entry.declaration.metadata } : {}),
    }))),
  };
  return { ...withoutHash, environmentSha256: sha256Hex(withoutHash) };
}

function collectCheckedNames(summary: CheckSummary): Set<string> {
  const names = new Set<string>();
  for (const decl of summary.declarations) {
    names.add(decl.name);
    for (const generated of decl.generated) names.add(generated);
  }
  if (summary.prelude) for (const installed of summary.prelude.installed) names.add(installed);
  return names;
}

function validateModulesMetadataAgainstSummary(modules: CoreArtifact["modules"], summary: CheckSummary): void {
  if (!modules) return;
  const checkedNames = collectCheckedNames(summary);
  for (const mod of modules.modules) {
    for (const name of mod.declarations) {
      if (!checkedNames.has(name)) throw new KernelDeclarationError(`core artifact modules.${mod.name}.declarations references unchecked declaration ${name}`);
    }
    for (const name of mod.exports) {
      if (!checkedNames.has(name)) throw new KernelDeclarationError(`core artifact modules.${mod.name}.exports references unchecked declaration ${name}`);
    }
  }
}

function makeCertificate(artifact: CoreArtifact, summary: SnapshotReplaySummary): CoreReplayCertificate | undefined {
  if (summary.status !== "accepted" || !summary.semanticSha256 || !summary.environmentSnapshot) return undefined;
  return {
    status: "accepted",
    proofStatus: "not-proven",
    trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet",
    semanticBaseline: "Lean 4.33.1",
    implementationProfile: artifact.implementationProfile,
    artifactSha256: sha256Hex(artifact),
    semanticSha256: summary.semanticSha256,
    environmentSha256: summary.environmentSnapshot.environmentSha256,
    declarations: summary.declarations.map(d => d.name),
    generated: summary.declarations.flatMap(d => d.generated).sort(),
    assumptions: [...summary.assumptions].sort(),
    prelude: summary.prelude,
  };
}

function declarationType(decl: CoreDeclaration): string {
  if ("type" in decl) return pretty(decl.type);
  if (decl.kind === "mutualInductive") return decl.inductives.map(i => `${i.name}: ${pretty(i.type)}`).join("; ");
  return "<primitive>";
}

function installPrelude(env: Environment, profile: CorePreludeProfile | undefined): { profile: CorePreludeProfile; installed: string[] } | undefined {
  const selected = profile ?? "none";
  if (selected === "none") return undefined;
  return { profile: selected, installed: installCorePrimitives(env, { quotients: selected === "core+quot" }) };
}

function checkCoreDeclarationsInEnvironment(env: Environment, decls: CoreDeclaration[], prelude?: { profile: CorePreludeProfile; installed: string[] }): CheckSummary {
  const checked: CheckSummary["declarations"] = [];
  const assumptions = new Set<string>();
  try {
    for (const decl of decls) {
      const result = checkAndAddDeclaration(env, decl);
      for (const a of result.assumptions) assumptions.add(a);
      checked.push({
        name: decl.name,
        kind: decl.kind,
        universes: decl.levelParams,
        type: declarationType(decl),
        generated: result.generated,
        assumptions: [...result.assumptions].sort(),
      });
    }
    return attachSemanticHash({ status: "accepted", declarations: checked, assumptions: [...assumptions].sort(), prelude });
  } catch (e) {
    if (e instanceof KernelResourceError) return { status: "resource_exhausted", declarations: checked, assumptions: [...assumptions].sort(), prelude, message: e.message };
    if (e instanceof KernelError) {
      return { status: e.code === "kernel_unsupported" ? "unsupported" : "rejected", declarations: checked, assumptions: [...assumptions].sort(), prelude, message: e.message };
    }
    return { status: "implementation_error", declarations: checked, assumptions: [...assumptions].sort(), prelude, message: e instanceof Error ? e.message : String(e) };
  }
}

export function checkCoreDeclarations(decls: CoreDeclaration[], implementationProfile?: CoreArtifact["implementationProfile"]): CheckSummary {
  const env = new Environment({ implementationProfile });
  return attachSemanticHash(checkCoreDeclarationsInEnvironment(env, decls), implementationProfile);
}

export function checkCoreDeclarationsWithPrelude(
  decls: CoreDeclaration[],
  implementationProfile?: CoreArtifact["implementationProfile"],
  preludeProfile: CorePreludeProfile = "none",
): CheckSummary {
  try {
    const env = new Environment({ implementationProfile });
    const prelude = installPrelude(env, preludeProfile);
    return attachSemanticHash(checkCoreDeclarationsInEnvironment(env, decls, prelude), implementationProfile);
  } catch (e) {
    if (e instanceof KernelError) {
      return { status: e.code === "kernel_unsupported" ? "unsupported" : "rejected", declarations: [], assumptions: [], message: e.message };
    }
    return { status: "implementation_error", declarations: [], assumptions: [], message: e instanceof Error ? e.message : String(e) };
  }
}

export function checkCoreDeclarationsWithSnapshot(
  decls: CoreDeclaration[],
  implementationProfile?: CoreArtifact["implementationProfile"],
  preludeProfile: CorePreludeProfile = "none",
): SnapshotReplaySummary {
  try {
    const env = new Environment({ implementationProfile });
    const prelude = installPrelude(env, preludeProfile);
    const summary = attachSemanticHash(checkCoreDeclarationsInEnvironment(env, decls, prelude), implementationProfile) as SnapshotReplaySummary;
    if (summary.status === "accepted") return { ...summary, environmentSnapshot: snapshotEnvironment(env, { label: implementationProfile ?? "pskernel-ts-check-core" }) };
    return summary;
  } catch (e) {
    if (e instanceof KernelError) {
      return { status: e.code === "kernel_unsupported" ? "unsupported" : "rejected", declarations: [], assumptions: [], message: e.message };
    }
    return { status: "implementation_error", declarations: [], assumptions: [], message: e instanceof Error ? e.message : String(e) };
  }
}

export function replayCoreArtifact(artifact: CoreArtifact): CheckSummary {
  try {
    validateCoreArtifact(artifact);
    const summary = checkCoreDeclarationsWithPrelude(artifact.declarations, artifact.implementationProfile, artifact.prelude ?? "none");
    if (summary.status === "accepted") validateModulesMetadataAgainstSummary(artifact.modules, summary);
    return summary;
  } catch (e) {
    if (e instanceof KernelError) {
      return { status: e.code === "kernel_unsupported" ? "unsupported" : "rejected", declarations: [], assumptions: [], message: e.message };
    }
    return { status: "implementation_error", declarations: [], assumptions: [], message: e instanceof Error ? e.message : String(e) };
  }
}

export function replayCoreArtifactWithSnapshot(artifact: CoreArtifact): SnapshotReplaySummary {
  try {
    validateCoreArtifact(artifact);
    const summary = checkCoreDeclarationsWithSnapshot(artifact.declarations, artifact.implementationProfile, artifact.prelude ?? "none");
    if (summary.status === "accepted") validateModulesMetadataAgainstSummary(artifact.modules, summary);
    return summary;
  } catch (e) {
    if (e instanceof KernelError) {
      return { status: e.code === "kernel_unsupported" ? "unsupported" : "rejected", declarations: [], assumptions: [], message: e.message };
    }
    return { status: "implementation_error", declarations: [], assumptions: [], message: e instanceof Error ? e.message : String(e) };
  }
}


export function certifyCoreArtifact(artifact: CoreArtifact): CertifiedReplaySummary {
  const summary = replayCoreArtifactWithSnapshot(artifact) as CertifiedReplaySummary;
  if (summary.status !== "accepted") return summary;
  return { ...summary, certificate: makeCertificate(artifact, summary) };
}

export function verifyCoreReplayCertificate(artifact: CoreArtifact, certificate: unknown): CoreReplayCertificateVerification {
  const trustLabel = "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet" as const;
  const rejected = (message: string): CoreReplayCertificateVerification => ({
    status: "rejected",
    proofStatus: "not-proven",
    trustLabel,
    semanticBaseline: "Lean 4.33.1",
    message,
  });
  try {
    validateCoreArtifact(artifact);
    const supplied = validateCoreReplayCertificate(certificate);
    const fresh = certifyCoreArtifact(artifact);
    if (fresh.status !== "accepted" || !fresh.certificate) {
      return {
        status: fresh.status,
        proofStatus: "not-proven",
        trustLabel,
        semanticBaseline: "Lean 4.33.1",
        implementationProfile: supplied.implementationProfile,
        artifactSha256: supplied.artifactSha256,
        semanticSha256: supplied.semanticSha256,
        environmentSha256: supplied.environmentSha256,
        message: fresh.message ?? "artifact no longer replays to an accepted certificate",
      };
    }
    const expected = fresh.certificate;
    if (stableStringify(supplied) !== stableStringify(expected)) {
      const mismatch = supplied.artifactSha256 !== expected.artifactSha256 ? "artifactSha256"
        : supplied.semanticSha256 !== expected.semanticSha256 ? "semanticSha256"
        : supplied.environmentSha256 !== expected.environmentSha256 ? "environmentSha256"
        : supplied.implementationProfile !== expected.implementationProfile ? "implementationProfile"
        : "certificate payload";
      return rejected(`core replay certificate mismatch: ${mismatch} does not match fresh replay`);
    }
    return {
      status: "accepted",
      proofStatus: "not-proven",
      trustLabel,
      semanticBaseline: "Lean 4.33.1",
      implementationProfile: expected.implementationProfile,
      artifactSha256: expected.artifactSha256,
      semanticSha256: expected.semanticSha256,
      environmentSha256: expected.environmentSha256,
    };
  } catch (e) {
    if (e instanceof KernelError) return rejected(e.message);
    return { status: "implementation_error", proofStatus: "not-proven", trustLabel, semanticBaseline: "Lean 4.33.1", message: e instanceof Error ? e.message : String(e) };
  }
}

export function auditCoreArtifact(artifact: CoreArtifact): CoreReplayAuditBundle {
  const trustLabel = "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet" as const;
  const obligations = proofObligationReport();
  const obligationsSha256 = sha256Hex(obligations);
  const certified = certifyCoreArtifact(artifact);
  const replay: CheckSummary = { ...certified };
  delete (replay as CertifiedReplaySummary).certificate;
  const base = {
    status: certified.status,
    proofStatus: "not-proven" as const,
    trustLabel,
    semanticBaseline: "Lean 4.33.1" as const,
    implementationProfile: artifact && typeof artifact === "object" ? (artifact as CoreArtifact).implementationProfile : undefined,
    replay,
    obligations,
    obligationsSha256,
    message: certified.message,
  };
  if (certified.status !== "accepted" || !certified.certificate) return base;
  const certificateVerification = verifyCoreReplayCertificate(artifact, certified.certificate);
  const accepted = certificateVerification.status === "accepted";
  const bundleWithoutHash = {
    ...base,
    status: accepted ? "accepted" as Status : certificateVerification.status,
    certificate: certified.certificate,
    certificateVerification,
    message: accepted ? undefined : certificateVerification.message,
  };
  return { ...bundleWithoutHash, auditSha256: sha256Hex(bundleWithoutHash) };
}

function rejectedBundleVerification(message: string): CoreReplayCertificateBundleVerification {
  return {
    status: "rejected",
    proofStatus: "not-proven",
    trustLabel: "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet",
    semanticBaseline: "Lean 4.33.1",
    message,
  };
}

export function createCoreReplayCertificateBundle(artifact: CoreArtifact): CoreReplayCertificateBundleResult {
  const trustLabel = "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet" as const;
  try {
    const certified = certifyCoreArtifact(artifact);
    if (certified.status !== "accepted" || !certified.certificate || !certified.environmentSnapshot) {
      return {
        status: certified.status,
        proofStatus: "not-proven",
        trustLabel,
        semanticBaseline: "Lean 4.33.1",
        message: certified.message ?? "artifact did not replay to an accepted certificate bundle",
      };
    }
    const certificateVerification = verifyCoreReplayCertificate(artifact, certified.certificate);
    if (certificateVerification.status !== "accepted") {
      return { ...certificateVerification, message: certificateVerification.message ?? "fresh certificate verification failed during bundle creation" };
    }
    const audit = auditCoreArtifact(artifact);
    if (audit.status !== "accepted" || !audit.auditSha256) {
      return {
        status: audit.status,
        proofStatus: "not-proven",
        trustLabel,
        semanticBaseline: "Lean 4.33.1",
        message: audit.message ?? "audit bundle did not accept during certificate-bundle creation",
      };
    }
    const certificate = certified.certificate;
    const environmentSnapshot = certified.environmentSnapshot;
    if (certificate.environmentSha256 !== environmentSnapshot.environmentSha256) {
      return rejectedBundleVerification("certificate environmentSha256 does not match environment snapshot");
    }
    const withoutHash = {
      format: "proofscript-core-replay-certificate-bundle" as const,
      version: 1 as const,
      status: "accepted" as const,
      proofStatus: "not-proven" as const,
      trustLabel,
      semanticBaseline: "Lean 4.33.1" as const,
      artifact,
      certificate,
      certificateVerification: certificateVerification as CoreReplayCertificateVerification & { status: "accepted" },
      environmentSnapshot,
      obligationsSha256: audit.obligationsSha256 ?? sha256Hex(proofObligationReport()),
      auditSha256: audit.auditSha256,
    };
    return { ...withoutHash, bundleSha256: sha256Hex(withoutHash) };
  } catch (e) {
    if (e instanceof KernelError) return rejectedBundleVerification(e.message);
    return { status: "implementation_error", proofStatus: "not-proven", trustLabel, semanticBaseline: "Lean 4.33.1", message: e instanceof Error ? e.message : String(e) };
  }
}

export function verifyCoreReplayCertificateBundle(bundle: unknown): CoreReplayCertificateBundleVerification {
  const trustLabel = "trusted-boundary standalone kernel; not fully formally equivalent to Lean 4 yet" as const;
  try {
    const supplied = validateCoreReplayCertificateBundle(bundle);
    if (supplied.certificate.environmentSha256 !== supplied.environmentSnapshot.environmentSha256) {
      return rejectedBundleVerification("core replay certificate bundle mismatch: certificate environmentSha256 does not match bundled snapshot");
    }
    const certificateVerification = verifyCoreReplayCertificate(supplied.artifact, supplied.certificate);
    if (certificateVerification.status !== "accepted") {
      return { ...certificateVerification, message: certificateVerification.message ?? "bundled certificate does not verify against bundled artifact" };
    }
    const expected = createCoreReplayCertificateBundle(supplied.artifact);
    if (expected.status !== "accepted" || !("bundleSha256" in expected)) {
      return {
        status: expected.status,
        proofStatus: "not-proven",
        trustLabel,
        semanticBaseline: "Lean 4.33.1",
        message: expected.message ?? "fresh replay did not recreate an accepted certificate bundle",
      };
    }
    const expectedBundle = expected as CoreReplayCertificateBundle;
    if (stableStringify(supplied) !== stableStringify(expectedBundle)) {
      const mismatch = supplied.bundleSha256 !== expectedBundle.bundleSha256 ? "bundleSha256"
        : supplied.auditSha256 !== expectedBundle.auditSha256 ? "auditSha256"
        : supplied.obligationsSha256 !== expectedBundle.obligationsSha256 ? "obligationsSha256"
        : supplied.environmentSnapshot.environmentSha256 !== expectedBundle.environmentSnapshot.environmentSha256 ? "environmentSnapshot"
        : supplied.certificate.semanticSha256 !== expectedBundle.certificate.semanticSha256 ? "certificate.semanticSha256"
        : "bundle payload";
      return rejectedBundleVerification(`core replay certificate bundle mismatch: ${mismatch} does not match fresh replay`);
    }
    return {
      status: "accepted",
      proofStatus: "not-proven",
      trustLabel,
      semanticBaseline: "Lean 4.33.1",
      artifactSha256: supplied.certificate.artifactSha256,
      semanticSha256: supplied.certificate.semanticSha256,
      environmentSha256: supplied.certificate.environmentSha256,
      obligationsSha256: supplied.obligationsSha256,
      auditSha256: supplied.auditSha256,
      bundleSha256: supplied.bundleSha256,
    };
  } catch (e) {
    if (e instanceof KernelError) return rejectedBundleVerification(e.message);
    return { status: "implementation_error", proofStatus: "not-proven", trustLabel, semanticBaseline: "Lean 4.33.1", message: e instanceof Error ? e.message : String(e) };
  }
}

export const portStatus_PSKernel_Replay = {
  source: "PSKernel/Replay.lean",
  target: "packages/kernel/src/PSKernel/Replay.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
