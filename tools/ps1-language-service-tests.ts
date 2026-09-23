#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CancellationSource,
  ProofScriptLanguageService,
} from "@proofscript/language-service";
import {
  checkSource as checkCompilerSource,
  withStandardPrelude,
  type FrontendProofState,
} from "@proofscript/compiler";

const compilerPartialStates: FrontendProofState[] = [];
assert.throws(
  () => checkCompilerSource(
    "theorem partialCompiler(P: Prop, h: P): P := by { exact missing }\n",
    withStandardPrelude({
      proofStateSink: (event) => compilerPartialStates.push(event.state),
    }),
  ),
  /unknown identifier: missing/u,
  "canonical compiler must still reject the bad proof",
);
assert.ok(
  compilerPartialStates.some((state) => state.tactic === "exact" && state.goal === "P"),
  "compiler observer must retain the failing tactic entry state before rejection",
);

const acceptedWithThrowingObserver = checkCompilerSource(
  "theorem observerFailOpen(P: Prop, h: P): P := by { assumption }\n",
  withStandardPrelude({
    proofStateSink: () => { throw new Error("observer failure must be ignored"); },
  }),
);
assert.equal(
  acceptedWithThrowingObserver.summary.status,
  "accepted",
  "proof-state observers must remain outside source acceptance",
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-language-service-"));
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
const srcDir = path.join(tmp, "src");
fs.mkdirSync(srcDir);
const mainFile = path.join(srcDir, "Main.ps");
fs.writeFileSync(mainFile, "theorem disk(P: Prop, h: P): P := h;\n");

const service = new ProofScriptLanguageService();
const uri = "proofscript-test://Main.ps";
const overlay = "theorem overlay(P: Prop, h: P): P := h;\n";
const opened = service.openDocument(uri, 1, overlay, mainFile);
assert.equal(opened.version, 1);
assert.equal(opened.text, overlay);
assert.equal(opened.filePath, path.resolve(mainFile));

const first = service.analyze(uri);
assert.equal(first.status, "accepted");
assert.ok(first.declarations.some((declaration) => declaration.name === "overlay"));
assert.ok(!first.declarations.some((declaration) => declaration.name === "disk"));
assert.equal(first.diagnostics.length, 0);
assert.equal(first.sourceDeclarations.length, 1);
assert.equal(first.sourceDeclarations[0].name, "overlay");
assert.equal(first.sourceDeclarations[0].qualifiedName, "overlay");
assert.deepEqual(first.sourceDeclarations[0].selectionRange.start, { line: 0, character: 8 });
assert.deepEqual(first.sourceDeclarations[0].selectionRange.end, { line: 0, character: 15 });

const overlaySymbols = service.documentSymbols(uri);
assert.equal(overlaySymbols.length, 1);
assert.equal(overlaySymbols[0].name, "overlay");
assert.equal(overlaySymbols[0].kind, "theorem");
assert.match(overlaySymbols[0].detail, /Prop/u);

const overlayHover = service.hover(uri, { line: 0, character: 10 });
assert.ok(overlayHover);
assert.equal(overlayHover.name, "overlay");
assert.equal(overlayHover.kind, "theorem");
assert.match(overlayHover.type, /Prop/u);
assert.equal(service.hover(uri, { line: 0, character: 0 }), null);

const overlayGoals = service.goals(uri, { line: 0, character: 10 });
assert.equal(overlayGoals.tacticStateAvailable, true);
assert.equal(overlayGoals.tacticState, null, "direct-term theorem has no tactic span at the cursor");
assert.equal(overlayGoals.declarationGoal?.origin, "compiler-theorem");
assert.equal(overlayGoals.declarationGoal?.name, "overlay");
assert.equal(overlayGoals.declarationGoal?.status, "checked");
assert.equal(overlayGoals.verification.status, "unavailable");

const overlaySha256 = createHash("sha256").update(overlay).digest("hex");
const obligationsPath = mainFile.replace(/\.ps$/u, ".obligations.json");
fs.writeFileSync(obligationsPath, JSON.stringify({
  schema: "proofscript.obligations.v1",
  source: { path: "src/Main.ps", sha256: overlaySha256 },
  obligations: [{
    id: "overlay.ensures.goal",
    name: "overlay_goal",
    kind: "ensures",
    statement: "P",
    exactTheoremStatement: "theorem overlay_goal (P : Prop) : P",
    status: "unproved",
    proofRequired: true,
  }],
  trustBoundary: { semanticProofChecking: false },
}, null, 2) + "\n");

const artifactGoals = service.goals(uri, { line: 0, character: 10 });
assert.equal(artifactGoals.verification.status, "current");
assert.equal(artifactGoals.verification.semanticProofChecking, false);
assert.equal(artifactGoals.verification.goals.length, 1);
assert.equal(artifactGoals.verification.goals[0].origin, "verification-artifact");
assert.equal(artifactGoals.verification.goals[0].name, "overlay_goal");
assert.equal(artifactGoals.verification.goals[0].status, "unproved");
assert.match(artifactGoals.verification.goals[0].exactTheoremStatement ?? "", /theorem overlay_goal/u);

const cached = service.analyze(uri);
assert.equal(cached, first, "same document generation should reuse the cached analysis object");

assert.throws(
  () => service.replaceDocument(uri, 1, overlay),
  /document version must increase/,
  "stale/same document versions must be rejected",
);

const invalid = service.updateDocument(uri, 2, [{ text: "theorem broken" }]);
assert.equal(invalid.version, 2);
const broken = service.analyze(uri);
assert.notEqual(broken.status, "accepted");
assert.equal(broken.diagnostics.length, 1);
assert.match(broken.diagnostics[0]!.code, /^PSLS/);
assert.equal(broken.diagnostics[0]!.data.identity.schemaVersion, 1);
assert.ok(broken.diagnostics[0]!.data.identity.fingerprint.length >= 16);
assert.notEqual(broken.resultId, first.resultId);

const repairedSource = "def repaired(P: Prop): Prop := P;\n";
service.replaceDocument(uri, 3, repairedSource);
const repaired = service.analyze(uri);
assert.equal(repaired.status, "accepted");
assert.ok(repaired.declarations.some((declaration) => declaration.name === "repaired"));
assert.equal(repaired.diagnostics.length, 0);
assert.equal(repaired.sourceDeclarations.length, 1);
assert.equal(repaired.sourceDeclarations[0].name, "repaired");
assert.deepEqual(repaired.sourceDeclarations[0].selectionRange.start, { line: 0, character: 4 });
assert.deepEqual(repaired.sourceDeclarations[0].selectionRange.end, { line: 0, character: 12 });
assert.equal(service.documentSymbols(uri)[0].name, "repaired");
assert.equal(service.hover(uri, { line: 0, character: 6 })?.name, "repaired");
const repairedCompletion = service.completion(uri, { line: 0, character: 7 });
assert.ok(repairedCompletion.some((item) => item.label === "repaired"));
assert.ok(repairedCompletion.every((item) => item.qualifiedName && item.detail));

const navigationSource = "def navBase: Nat := 1;\ndef navUse: Nat := navBase;\n";
service.replaceDocument(uri, 4, navigationSource);
const navigation = service.analyze(uri);
assert.equal(navigation.status, "accepted");
assert.ok(navigation.sourceReferences.some((reference) => reference.resolvedName === "navBase"));
const navDefinition = service.definition(uri, { line: 1, character: 21 });
assert.ok(navDefinition);
assert.equal(navDefinition.uri, uri);
assert.deepEqual(navDefinition.range.start, { line: 0, character: 4 });
assert.deepEqual(navDefinition.range.end, { line: 0, character: 11 });
const navReferences = service.references(uri, { line: 1, character: 21 }, true);
assert.equal(navReferences.length, 2);
const navRename = service.rename(uri, { line: 1, character: 21 }, "renamedBase");
assert.equal(navRename.changes[uri]?.length, 2);
assert.ok(navRename.changes[uri]?.every((edit) => edit.newText === "renamedBase"));
const navTokens = service.semanticTokens(uri);
assert.equal(navTokens.length, 3);
assert.equal(navTokens.filter((token) => token.modifiers.includes("declaration")).length, 2);
assert.ok(navTokens.some((token) =>
  token.range.start.line === 1
  && token.range.start.character === 19
  && token.kind === "function"
  && token.modifiers.length === 0
));
assert.throws(
  () => service.rename(uri, { line: 1, character: 21 }, "123bad"),
  /invalid ProofScript identifier/u,
);

const explicitParams = repaired.surfaceFeatures.find((feature) => feature.feature === "D-EXPLICIT-PARAMS");
assert.ok(explicitParams, "language service must expose compiler-owned surface features");
assert.equal(explicitParams.startOffset, 0);
assert.ok(explicitParams.endOffset > explicitParams.startOffset);
assert.deepEqual(explicitParams.range.start, { line: 0, character: 0 });
assert.ok(explicitParams.range.end.line > explicitParams.range.start.line || explicitParams.range.end.character > explicitParams.range.start.character);

const cancellation = new CancellationSource();
cancellation.cancel();
assert.throws(
  () => service.analyze(uri, true, cancellation.token),
  /request cancelled/,
  "cancelled analysis must stop before compiler work",
);
assert.throws(
  () => service.completion(uri, { line: 0, character: 7 }, cancellation.token),
  /request cancelled/,
  "cancelled completion must stop through the same compiler-backed cancellation boundary",
);

const diagnosticBundle = service.diagnostics(uri);
assert.equal(diagnosticBundle.version, 4);
assert.equal(diagnosticBundle.generation, service.getDocument(uri)!.generation);
assert.equal(diagnosticBundle.resultId, navigation.resultId);

service.closeDocument(uri);
assert.equal(service.getDocument(uri), undefined);
assert.throws(() => service.analyze(uri), /document is not open/);

// Rejected-but-parseable proofs retain states emitted before the failure.
const partialFile = path.join(srcDir, "Partial.ps");
const partialUri = "proofscript-test://Partial.ps";
const partialSource = "theorem partial(P: Prop, h: P): P := by { exact missing }\n";
fs.writeFileSync(partialFile, partialSource);
const partialService = new ProofScriptLanguageService();
partialService.openDocument(partialUri, 1, partialSource, partialFile);
const partialAnalysis = partialService.analyze(partialUri);
assert.equal(partialAnalysis.status, "rejected");
assert.equal(partialAnalysis.diagnostics.length, 1);
assert.ok(
  partialAnalysis.proofStates.some((state) => state.tactic === "exact"),
  "rejected elaboration should retain compiler-observed tactic states",
);
const partialExactCharacter = partialSource.indexOf("exact") + 1;
const partialGoals = partialService.goals(partialUri, { line: 0, character: partialExactCharacter });
assert.equal(partialGoals.tacticStateAvailable, true);
assert.equal(partialGoals.tacticState?.kind, "tactic");
assert.equal(partialGoals.tacticState?.tactic, "exact");
assert.equal(partialGoals.tacticState?.goal, "P");
assert.deepEqual(partialGoals.tacticState?.locals.map((local) => local.name), ["P", "h"]);
assert.equal(partialGoals.declarationGoal, null, "rejected declarations must not be reported as checked goals");
partialService.closeDocument(partialUri);

// Branch-aware tactics must flow through the existing compiler-backed editor path.
const branchService = new ProofScriptLanguageService();
const branchUri = "proofscript-test://BranchAware.ps";
const branchSource = `axiom P: Prop;
inductive ChainP: Prop where {
  | base (value: P)
  | step (tail: ChainP)
}
theorem branchAware(h: ChainP): P := by {
  induction h
  | step tail ih => exact ih
  | base value => exact value
}
`;
branchService.openDocument(branchUri, 1, branchSource);
const branchAnalysis = branchService.analyze(branchUri);
assert.equal(branchAnalysis.status, "accepted");
assert.ok(branchAnalysis.declarations.some((declaration) => declaration.name === "branchAware"));
assert.ok(branchAnalysis.proofStates.length >= 5, "checked branch proof should expose tactic + branch observations");
const branchGoals = branchService.goals(branchUri, { line: 6, character: 4 });
assert.equal(branchGoals.declarationGoal?.name, "branchAware");
assert.equal(branchGoals.tacticStateAvailable, true);
assert.equal(branchGoals.tacticState?.kind, "tactic");
assert.equal(branchGoals.tacticState?.tactic, "induction");
assert.equal(branchGoals.tacticState?.goal, "P");
assert.deepEqual(branchGoals.tacticState?.locals.map((local) => local.name), ["h"]);

const stepBranchGoals = branchService.goals(branchUri, { line: 7, character: 5 });
assert.equal(stepBranchGoals.tacticState?.kind, "branch");
assert.equal(stepBranchGoals.tacticState?.tactic, "induction");
assert.equal(stepBranchGoals.tacticState?.branch, "ChainP.step");
assert.equal(stepBranchGoals.tacticState?.goal, "P");
assert.deepEqual(stepBranchGoals.tacticState?.locals.map((local) => local.name), ["h", "tail", "ih"]);
assert.equal(stepBranchGoals.tacticState?.locals.find((local) => local.name === "ih")?.type, "P");

const stepExactGoals = branchService.goals(branchUri, { line: 7, character: 22 });
assert.equal(stepExactGoals.tacticState?.kind, "tactic");
assert.equal(stepExactGoals.tacticState?.tactic, "exact");
assert.equal(stepExactGoals.tacticState?.goal, "P");
assert.deepEqual(stepExactGoals.tacticState?.locals.map((local) => local.name), ["h", "tail", "ih"]);
branchService.closeDocument(branchUri);
// Canonical formatter reuse: one implementation for CLI and editor.
const formatService = new ProofScriptLanguageService();
const formatUri = "proofscript-test://Format.ps";
formatService.openDocument(formatUri, 1, "def   formatted : Nat:={1+2};\n");
const formatEdits = formatService.formatDocument(formatUri);
assert.equal(formatEdits.length, 1);
assert.deepEqual(formatEdits[0].range.start, { line: 0, character: 0 });
assert.match(formatEdits[0].newText, /def formatted: Nat := \{1 \+ 2\};/u);
formatService.replaceDocument(formatUri, 2, formatEdits[0].newText);
assert.deepEqual(formatService.formatDocument(formatUri), [], "canonical formatting must be idempotent");
formatService.replaceDocument(formatUri, 3, "-- keep\ndef   x : Nat:={1+2};\n");
const commentFormatEdits = formatService.formatDocument(formatUri);
assert.equal(commentFormatEdits.length, 1);
assert.match(commentFormatEdits[0].newText, /-- keep/u);
assert.match(commentFormatEdits[0].newText, /def x: Nat := \{1 \+ 2\};/u);
formatService.closeDocument(formatUri);

// Bounded code actions reuse canonical diagnostics/formatter; no editor-side parsing.
const actionService = new ProofScriptLanguageService();
const actionFile = path.join(srcDir, "Actions.ps");
const actionUri = "proofscript-test://Actions.ps";
const missingSemicolonSource = "def missing: Nat := 1\n";
fs.writeFileSync(actionFile, missingSemicolonSource);
actionService.openDocument(actionUri, 1, missingSemicolonSource, actionFile);
const missingAnalysis = actionService.analyze(actionUri);
assert.equal(missingAnalysis.status, "rejected");
assert.equal(missingAnalysis.diagnostics.length, 1);
assert.equal(missingAnalysis.diagnostics[0].code, "PSLS1001");
assert.match(missingAnalysis.diagnostics[0].data.rawMessage, /^expected ';' at offset \d+, found '/u);
const missingActions = actionService.codeActions(actionUri, missingAnalysis.diagnostics[0].range);
assert.equal(missingActions.length, 1);
assert.equal(missingActions[0].title, "Insert missing ';'");
assert.equal(missingActions[0].kind, "quickfix");
assert.equal(missingActions[0].isPreferred, true);
const semicolonEdit = missingActions[0].edit.changes[actionUri]?.[0];
assert.ok(semicolonEdit);
assert.equal(semicolonEdit.newText, ";");
actionService.updateDocument(actionUri, 2, [{
  range: semicolonEdit.range,
  text: semicolonEdit.newText,
}]);
assert.equal(actionService.analyze(actionUri).status, "accepted");

const messyActionSource = "def   actionFormatted : Nat:={1+2};\n";
actionService.replaceDocument(actionUri, 3, messyActionSource);
const formatActions = actionService.codeActions(actionUri, {
  start: { line: 0, character: 0 },
  end: { line: 0, character: messyActionSource.length - 1 },
});
assert.equal(formatActions.length, 1);
assert.equal(formatActions[0].title, "Format ProofScript document");
assert.equal(formatActions[0].kind, "source.format.proofscript");
assert.match(formatActions[0].edit.changes[actionUri]?.[0]?.newText ?? "", /def actionFormatted: Nat := \{1 \+ 2\};/u);
actionService.closeDocument(actionUri);

// Project-level incremental reuse + importer invalidation.
const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-language-service-project-"));
fs.writeFileSync(path.join(projectRoot, "package.json"), JSON.stringify({ private: true }, null, 2) + "\n");
const projectSrc = path.join(projectRoot, "src");
fs.mkdirSync(projectSrc);
const libFile = path.join(projectSrc, "Lib.ps");
const projectMainFile = path.join(projectSrc, "Main.ps");
fs.writeFileSync(libFile, "theorem libIdentity(P: Prop, h: P): P := h;\n");
fs.writeFileSync(projectMainFile, "import Lib;\ntheorem mainIdentity(P: Prop, h: P): P := h;\n");

const projectService = new ProofScriptLanguageService();
const libUri = "proofscript-test://Lib.ps";
const mainUri = "proofscript-test://ProjectMain.ps";
projectService.openDocument(libUri, 1, fs.readFileSync(libFile, "utf8"), libFile);
projectService.openDocument(mainUri, 1, fs.readFileSync(projectMainFile, "utf8"), projectMainFile);

const coldProject = projectService.analyze(mainUri);
assert.equal(coldProject.status, "accepted");
assert.deepEqual(coldProject.moduleReuse?.reused, []);
assert.deepEqual(coldProject.moduleReuse?.rebuilt, ["Lib", "Main"]);

projectService.replaceDocument(
  mainUri,
  2,
  "import Lib;\ntheorem mainChanged(P: Prop, h: P): P := h;\n",
);
const mainOnlyChanged = projectService.analyze(mainUri);
assert.equal(mainOnlyChanged.status, "accepted");
assert.deepEqual(mainOnlyChanged.moduleReuse?.reused, ["Lib"]);
assert.deepEqual(mainOnlyChanged.moduleReuse?.rebuilt, ["Main"]);
assert.ok(mainOnlyChanged.declarations.some((declaration) => declaration.name === "mainChanged"));
assert.deepEqual(mainOnlyChanged.sourceDeclarations.map((declaration) => declaration.name), ["mainChanged"]);
assert.deepEqual(projectService.documentSymbols(mainUri).map((symbol) => symbol.name), ["mainChanged"]);
assert.equal(projectService.hover(mainUri, { line: 1, character: 10 })?.name, "mainChanged");

projectService.replaceDocument(
  libUri,
  2,
  "theorem libChanged(P: Prop, h: P): P := h;\n",
);
const dependencyChanged = projectService.analyze(mainUri);
assert.equal(dependencyChanged.status, "accepted");
assert.deepEqual(dependencyChanged.moduleReuse?.reused, []);
assert.deepEqual(
  dependencyChanged.moduleReuse?.rebuilt,
  ["Lib", "Main"],
  "changing an imported overlay must invalidate the importer analysis and conservatively rebuild dependents",
);
assert.ok(dependencyChanged.declarations.some((declaration) => declaration.name === "libChanged"));
assert.ok(!dependencyChanged.declarations.some((declaration) => declaration.name === "libIdentity"));
assert.deepEqual(
  dependencyChanged.sourceDeclarations.map((declaration) => declaration.name),
  ["mainChanged"],
  "editor source index for an importer must contain only declarations from that document",
);

const stableProject = projectService.analyze(mainUri, true);
assert.equal(stableProject.status, "accepted");
assert.deepEqual(stableProject.moduleReuse?.reused, ["Lib", "Main"]);
assert.deepEqual(stableProject.moduleReuse?.rebuilt, []);

console.log("PS1_LANGUAGE_SERVICE_TESTS=PASS");
