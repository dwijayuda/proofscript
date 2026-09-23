#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CancellationSource,
  ProofScriptLanguageService,
} from "@proofscript/language-service";

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
assert.throws(
  () => service.rename(uri, { line: 1, character: 21 }, "123bad"),
  /invalid ProofScript identifier/u,
);

const explicitParams = navigation.surfaceFeatures.find((feature) => feature.feature === "D-EXPLICIT-PARAMS");
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
