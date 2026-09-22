import { checkCoreDeclarationsWithPrelude } from "@proofscript/kernel";
import { ArenaMalformedInputError, NdjsonRecord } from "./ndjson";
import { ArenaSemanticRejectionError, ArenaUnsupportedFeatureError, translateLean4ExportNdjson } from "./translate";
import { ArenaResult, accepted, rejected, unsupported } from "./result";

export const ARENA_ADAPTER_PROFILE = "KERNEL-level-instantiation-conformance1";

export function checkArenaRecords(records: NdjsonRecord[]): ArenaResult {
  let translated = 0;
  try {
    const translation = translateLean4ExportNdjson(records);
    translated = translation.declarations.length;
    const summary = checkCoreDeclarationsWithPrelude(translation.declarations, ARENA_ADAPTER_PROFILE, "none");
    switch (summary.status) {
      case "accepted": return accepted(translation.recordsRead, translated, summary.declarations.length);
      case "unsupported": {
        const message = summary.message ?? "kernel declined unsupported translated Core";
        // A raw `proj` whose target family is not a structure-like inductive is
        // malformed trusted input for the supported Arena slice, not a benign
        // missing feature.  Treat it as a semantic rejection so bad Arena
        // projection attacks cannot hide behind exit 2.
        if (/projection typing for non-structure family/i.test(message) || /projection .* targets an unknown or non-inductive family/i.test(message)) return rejected(message, translation.recordsRead, translated);
        return unsupported(message, translation.recordsRead, translated, "kernel");
      }
      case "resource_exhausted": return unsupported(summary.message ?? "kernel resource limit exhausted", translation.recordsRead, translated, "resource");
      case "rejected": {
        const message = summary.message ?? "kernel rejected translated declarations";
        if (/type mismatch: inferred[\s\S]*(?:Eq\.rec|Acc\.rec)/.test(message)) {
          // Eq.rec K-like reduction and Acc.rec non-eta behavior are implemented
          // by the trusted kernel slice.  If the fully translated declaration
          // still fails by definitional equality here, that is a semantic
          // rejection, not an importer capability gap.
          return rejected(message, translation.recordsRead, translated);
        }
        if (/type mismatch: inferred[\s\S]*\.rec\./.test(message) || /type mismatch: inferred[\s\S]*\(.*\.rec\./.test(message)) {
          return unsupported(`translated declaration needs recursor reduction/eta behavior outside arena-inductive-importer0: ${message}`, translation.recordsRead, translated, "kernel.rec.defeq");
        }
        return rejected(message, translation.recordsRead, translated);
      }
      case "implementation_error": return rejected(summary.message ?? "internal kernel implementation error", translation.recordsRead, translated);
    }
  } catch (error) {
    if (error instanceof ArenaUnsupportedFeatureError) return unsupported(error.message, records.length, translated, error.kind);
    if (error instanceof ArenaSemanticRejectionError) return rejected(error.message, records.length, translated);
    if (error instanceof ArenaMalformedInputError) return rejected(error.message, records.length, translated);
    const detail = error instanceof Error ? error.message : String(error);
    return rejected(`internal arena checker error: ${detail}`, records.length, translated);
  }
}
