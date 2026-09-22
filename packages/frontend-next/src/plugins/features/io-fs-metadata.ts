import { ProofScriptError } from "../../core/errors.js";
import type { IRParam, IRType } from "../../core/model.js";
import type { PluginManifest, ProofScriptPlugin } from "../../core/plugin-api.js";
import { nominalType, typeArgument } from "../../core/type-utils.js";
import { exactMatchableKey, type MatchableDescriptor } from "./matchable.js";
import type { PatternMatchSyntaxMetadata } from "./pattern-engine.js";

function valueParam(name: string, type: IRType): IRParam { return { name, type, binderInfo: "explicit" }; }
function ioOf(inner: IRType): IRType { return nominalType(`lean.io(${inner.id})`, `IO(${inner.displayName})`, "lean.io", [typeArgument(inner)]); }

const fileType = nominalType("IO.FS.FileType", "IO.FS.FileType");
const systemTime = nominalType("IO.FS.SystemTime", "IO.FS.SystemTime");
const metadata = nominalType("IO.FS.Metadata", "IO.FS.Metadata");
const intType = nominalType("Int", "Int");
const uint32 = nominalType("UInt32", "UInt32");
const uint64 = nominalType("UInt64", "UInt64");
const filePath = nominalType("System.FilePath", "System.FilePath");

const fileTypeVariants = ["dir", "file", "symlink", "other"] as const;

export const proofscriptManifest: PluginManifest = {
  schema: "proofscript.plugin/v1",
  id: "proofscript.feature.io-fs-metadata",
  version: "0.91.0",
  kind: "feature",
  semanticIds: [
    ...fileTypeVariants.map((name) => `lean.io.fs.fileType.${name}`),
    "lean.io.fs.fileType.match",
    "lean.io.fs.systemTime.mk", "lean.io.fs.systemTime.sec", "lean.io.fs.systemTime.nsec",
    "lean.io.fs.metadata.mk", "lean.io.fs.metadata.accessed", "lean.io.fs.metadata.modified",
    "lean.io.fs.metadata.byteSize", "lean.io.fs.metadata.type", "lean.io.fs.metadata.numLinks",
    "lean.io.fs.metadata", "lean.io.fs.symlinkMetadata",
  ],
  proofscriptBaseline: "v0.1",
  leanBaseline: "4.33.1",
  lean: { assumptionPolicy: "none" },
};

const plugin: ProofScriptPlugin = {
  id: proofscriptManifest.id,
  version: proofscriptManifest.version,
  kind: "feature",
  requires: [
    "proofscript.feature.io", "proofscript.feature.filepath", "proofscript.feature.int",
    "proofscript.feature.uint32", "proofscript.feature.uint64", "proofscript.feature.match",
  ],
  setup(registry) {
    registry.registerType("IO.FS.FileType", "IO.FS.FileType");
    registry.registerType("IO.FS.SystemTime", "IO.FS.SystemTime");
    registry.registerType("IO.FS.Metadata", "IO.FS.Metadata");

    registry.registerSemanticInfo(exactMatchableKey(fileType.id), {
      matchOperation: "lean.io.fs.fileType.match",
      variantsFor(type) {
        if (type.id !== fileType.id) throw new ProofScriptError("PS2M01", `Expected IO.FS.FileType, got '${type.displayName}'.`);
        return fileTypeVariants.map((name) => ({ name, fields: [] }));
      },
    } satisfies MatchableDescriptor);

    for (const name of fileTypeVariants) {
      const op = `lean.io.fs.fileType.${name}`;
      registry.registerBuiltinFunction(`IO.FS.FileType.${name}`, { params: [], result: fileType, operation: op });
      registry.registerOperation(op, {
        requiredCapabilities: ["core.io.fs.metadata.structural"],
        verification: { level: "kernel-checkable", notes: `Lean IO.FS.FileType.${name} constructor.` },
      });
      registry.registerLeanExprLowering(op, (expr) => {
        if (expr.kind !== "op" || expr.args.length !== 0) throw new ProofScriptError("PS4M01", `Malformed IO.FS.FileType.${name} IR node.`);
        return `IO.FS.FileType.${name}`;
      });
    }

    registry.registerOperation("lean.io.fs.fileType.match", {
      requiredCapabilities: ["core.io.fs.fileType.match"],
      verification: { level: "kernel-checkable", notes: "Lean exhaustive match over IO.FS.FileType." },
    });
    registry.registerLeanExprLowering("lean.io.fs.fileType.match", (expr, context) => {
      if (expr.kind !== "extension") throw new ProofScriptError("PS4M02", "Expected IO.FS.FileType match extension node.");
      const payload = expr.payload as { cases: readonly { variant: string; binders: readonly string[] }[]; matchSyntax?: PatternMatchSyntaxMetadata };
      const [scrutinee, ...bodies] = expr.args;
      const branches = payload.cases.map((item, index) => {
        if (!fileTypeVariants.includes(item.variant as typeof fileTypeVariants[number]) || item.binders.length !== 0) {
          throw new ProofScriptError("PS4M03", `Invalid IO.FS.FileType match branch '${item.variant}'.`);
        }
        return `| IO.FS.FileType.${item.variant} => ${context.emitExpr(bodies[index]!)}`;
      });
      const options: string[] = [];
      if (payload.matchSyntax?.generalizing !== undefined) options.push(`(generalizing := ${payload.matchSyntax.generalizing ? "true" : "false"})`);
      if (payload.matchSyntax?.motive) options.push(`(motive := ${context.emitType(payload.matchSyntax.motive)})`);
      const discr = payload.matchSyntax?.discriminantEqualityName
        ? `${payload.matchSyntax.discriminantEqualityName} : ${context.emitExpr(scrutinee!)}`
        : context.emitExpr(scrutinee!);
      return `(match${options.length ? ` ${options.join(" ")}` : ""} ${discr} with ${branches.join(" ")})`;
    });

    const structuralOps = [
      ["lean.io.fs.systemTime.mk", "Lean IO.FS.SystemTime.mk structure constructor."],
      ["lean.io.fs.systemTime.sec", "Lean IO.FS.SystemTime.sec projection."],
      ["lean.io.fs.systemTime.nsec", "Lean IO.FS.SystemTime.nsec projection."],
      ["lean.io.fs.metadata.mk", "Lean IO.FS.Metadata.mk structure constructor."],
      ["lean.io.fs.metadata.accessed", "Lean IO.FS.Metadata.accessed projection."],
      ["lean.io.fs.metadata.modified", "Lean IO.FS.Metadata.modified projection."],
      ["lean.io.fs.metadata.byteSize", "Lean IO.FS.Metadata.byteSize projection."],
      ["lean.io.fs.metadata.type", "Lean IO.FS.Metadata.type projection."],
      ["lean.io.fs.metadata.numLinks", "Lean IO.FS.Metadata.numLinks projection."],
    ] as const;
    for (const [op, notes] of structuralOps) registry.registerOperation(op, {
      requiredCapabilities: ["core.io.fs.metadata.structural"], verification: { level: "kernel-checkable", notes },
    });

    registry.registerBuiltinFunction("IO.FS.SystemTime.mk", { params: [valueParam("sec", intType), valueParam("nsec", uint32)], result: systemTime, operation: "lean.io.fs.systemTime.mk" });
    registry.registerBuiltinFunction("IO.FS.SystemTime.sec", { params: [valueParam("self", systemTime)], result: intType, operation: "lean.io.fs.systemTime.sec" });
    registry.registerBuiltinFunction("IO.FS.SystemTime.nsec", { params: [valueParam("self", systemTime)], result: uint32, operation: "lean.io.fs.systemTime.nsec" });

    registry.registerBuiltinFunction("IO.FS.Metadata.mk", {
      params: [valueParam("accessed", systemTime), valueParam("modified", systemTime), valueParam("byteSize", uint64), valueParam("type", fileType), valueParam("numLinks", uint64)],
      result: metadata, operation: "lean.io.fs.metadata.mk",
    });
    registry.registerBuiltinFunction("IO.FS.Metadata.accessed", { params: [valueParam("self", metadata)], result: systemTime, operation: "lean.io.fs.metadata.accessed" });
    registry.registerBuiltinFunction("IO.FS.Metadata.modified", { params: [valueParam("self", metadata)], result: systemTime, operation: "lean.io.fs.metadata.modified" });
    registry.registerBuiltinFunction("IO.FS.Metadata.byteSize", { params: [valueParam("self", metadata)], result: uint64, operation: "lean.io.fs.metadata.byteSize" });
    registry.registerBuiltinFunction("IO.FS.Metadata.type", { params: [valueParam("self", metadata)], result: fileType, operation: "lean.io.fs.metadata.type" });
    registry.registerBuiltinFunction("IO.FS.Metadata.numLinks", { params: [valueParam("self", metadata)], result: uint64, operation: "lean.io.fs.metadata.numLinks" });

    registry.registerBuiltinFunction("System.FilePath.metadata", { params: [valueParam("self", filePath)], result: ioOf(metadata), operation: "lean.io.fs.metadata" });
    registry.registerBuiltinFunction("System.FilePath.symlinkMetadata", { params: [valueParam("self", filePath)], result: ioOf(metadata), operation: "lean.io.fs.symlinkMetadata" });
    registry.registerOperation("lean.io.fs.metadata", {
      requiredCapabilities: ["core.io.fs.metadata"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.metadata; follows symlinks; host correspondence is primitive/platform specific." }, domain: "runtime",
    });
    registry.registerOperation("lean.io.fs.symlinkMetadata", {
      requiredCapabilities: ["core.io.fs.symlinkMetadata"],
      verification: { level: "kernel-checkable", notes: "Lean System.FilePath.symlinkMetadata; does not follow symlinks; host correspondence is primitive/platform specific." }, domain: "runtime",
    });

    registry.registerLeanTypeLowering("IO.FS.FileType", () => "IO.FS.FileType");
    registry.registerLeanTypeLowering("IO.FS.SystemTime", () => "IO.FS.SystemTime");
    registry.registerLeanTypeLowering("IO.FS.Metadata", () => "IO.FS.Metadata");

    const leanUnary = (opName: string, leanName: string) => registry.registerLeanExprLowering(opName, (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 1) throw new ProofScriptError("PS4M04", `Malformed ${leanName} IR node.`);
      return `(${leanName} ${context.emitExpr(expr.args[0]!)})`;
    });
    registry.registerLeanExprLowering("lean.io.fs.systemTime.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 2) throw new ProofScriptError("PS4M05", "Malformed IO.FS.SystemTime.mk IR node.");
      return `(IO.FS.SystemTime.mk ${context.emitExpr(expr.args[0]!)} ${context.emitExpr(expr.args[1]!)})`;
    });
    leanUnary("lean.io.fs.systemTime.sec", "IO.FS.SystemTime.sec");
    leanUnary("lean.io.fs.systemTime.nsec", "IO.FS.SystemTime.nsec");
    registry.registerLeanExprLowering("lean.io.fs.metadata.mk", (expr, context) => {
      if (expr.kind !== "op" || expr.args.length !== 5) throw new ProofScriptError("PS4M06", "Malformed IO.FS.Metadata.mk IR node.");
      return `(IO.FS.Metadata.mk ${expr.args.map((arg) => context.emitExpr(arg)).join(" ")})`;
    });
    leanUnary("lean.io.fs.metadata.accessed", "IO.FS.Metadata.accessed");
    leanUnary("lean.io.fs.metadata.modified", "IO.FS.Metadata.modified");
    leanUnary("lean.io.fs.metadata.byteSize", "IO.FS.Metadata.byteSize");
    leanUnary("lean.io.fs.metadata.type", "IO.FS.Metadata.type");
    leanUnary("lean.io.fs.metadata.numLinks", "IO.FS.Metadata.numLinks");
    leanUnary("lean.io.fs.metadata", "System.FilePath.metadata");
    leanUnary("lean.io.fs.symlinkMetadata", "System.FilePath.symlinkMetadata");
  },
};
export default plugin;
