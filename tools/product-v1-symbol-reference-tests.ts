#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { IncrementalCompilerSession } from "../packages/compiler/src/index.ts";
import { ProofScriptLanguageService } from "../packages/language-service/src/index.ts";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-symbol-reference-"));
const src = path.join(tmp, "src");
fs.mkdirSync(src, { recursive: true });
fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "nav-fixture", private: true }, null, 2) + "\n");

const libPath = path.join(src, "Lib.ps");
const mainPath = path.join(src, "Main.ps");
const libSource = [
  "def target(x: Nat): Nat := x;",
  "def localShadow(target: Nat): Nat := target;",
  "",
].join("\n");
const mainSource = [
  "import Lib;",
  "def caller(x: Nat): Nat := target(x);",
  "",
].join("\n");
fs.writeFileSync(libPath, libSource);
fs.writeFileSync(mainPath, mainSource);

try {
  const session = new IncrementalCompilerSession();
  const workspace = session.checkWorkspaceForFile(mainPath);
  const lib = workspace.modules.find((module) => module.source.name === "Lib");
  const main = workspace.modules.find((module) => module.source.name === "Main");
  assert.ok(lib);
  assert.ok(main);

  const targetDecl = lib.declarationLocations.find((item) => item.qualifiedName === "target");
  assert.ok(targetDecl, "target declaration must retain a canonical source location");
  assert.equal(
    lib.globalReferences.some((reference) =>
      reference.resolvedName === "target"
      && libSource.slice(reference.startOffset, reference.endOffset) === "target"
    ),
    false,
    "same-spelled local parameter references must not be indexed as the global target",
  );

  const targetRefs = main.globalReferences.filter((reference) => reference.resolvedName === "target");
  assert.equal(targetRefs.length, 1);
  assert.equal(mainSource.slice(targetRefs[0].startOffset, targetRefs[0].endOffset), "target");

  const service = new ProofScriptLanguageService();
  const mainUri = pathToFileURL(mainPath).toString();
  const libUri = pathToFileURL(libPath).toString();
  service.openDocument(mainUri, 1, mainSource, mainPath);

  const targetOffset = mainSource.indexOf("target(x)");
  assert.ok(targetOffset >= 0);
  const targetPosition = positionAt(mainSource, targetOffset + 2);

  const definition = service.definition(mainUri, targetPosition);
  assert.ok(definition);
  assert.equal(definition.uri, libUri);
  assert.equal(sliceRange(libSource, definition.range), "target");

  const references = service.references(mainUri, targetPosition, true);
  assert.equal(references.length, 2, "global target must have exactly declaration + direct global call reference");
  assert.ok(references.some((location) => location.uri === libUri && sliceRange(libSource, location.range) === "target"));
  assert.ok(references.some((location) => location.uri === mainUri && sliceRange(mainSource, location.range) === "target"));

  const rename = service.rename(mainUri, targetPosition, "renamed");
  assert.deepEqual(Object.keys(rename.changes).sort(), [libUri, mainUri].sort());
  assert.equal(rename.changes[libUri].length, 1, "Lib edit must rename only the global declaration, not localShadow(target)");
  assert.equal(rename.changes[mainUri].length, 1);
  assert.equal(sliceRange(libSource, rename.changes[libUri][0].range), "target");
  assert.equal(sliceRange(mainSource, rename.changes[mainUri][0].range), "target");
  assert.equal(rename.changes[libUri][0].newText, "renamed");
  assert.equal(rename.changes[mainUri][0].newText, "renamed");

  assert.throws(
    () => service.rename(mainUri, targetPosition, "bad-name"),
    /invalid ProofScript identifier/u,
  );

  service.closeDocument(mainUri);
  console.log("PRODUCT_V1_SYMBOL_REFERENCE_TESTS=PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

function positionAt(text: string, offset: number) {
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  return { line: lines.length - 1, character: lines.at(-1)?.length ?? 0 };
}

function offsetAt(text: string, position: { line: number; character: number }) {
  const lines = text.split("\n");
  let offset = 0;
  for (let line = 0; line < position.line; line++) offset += lines[line].length + 1;
  return offset + position.character;
}

function sliceRange(text: string, range: { start: { line: number; character: number }; end: { line: number; character: number } }) {
  return text.slice(offsetAt(text, range.start), offsetAt(text, range.end));
}
