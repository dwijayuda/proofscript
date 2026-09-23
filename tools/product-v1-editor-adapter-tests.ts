#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lsp = fs.readFileSync(path.join(root,"packages/lsp/src/index.ts"),"utf8");
const extension = fs.readFileSync(path.join(root,"editors/vscode/src/extension.js"),"utf8");
const grammar = JSON.parse(fs.readFileSync(path.join(root,"editors/vscode/syntaxes/proofscript.tmLanguage.json"),"utf8"));

for (const method of ["proofscript/serverInfo","proofscript/documentStatus","proofscript/semanticInfo","proofscript/goals"]) {
  assert.ok(lsp.includes(method), "missing LSP adapter method " + method);
}
assert.match(lsp,/proofStateAvailable:\s*false/u);
assert.match(lsp,/editorFeatureLevel:\s*"document-semantic0"/u);
assert.match(lsp,/documentStatusFromAnalysis/u);
assert.ok(lsp.includes("proofscript/documentProcessing"));
assert.ok(lsp.includes("proofscript/documentStatusChanged"));

for (const supported of ["textDocument/hover","textDocument/documentSymbol","textDocument/completion","textDocument/definition","textDocument/references","textDocument/rename","textDocument/semanticTokens/full","textDocument/formatting","proofscript/documentStatus","proofscript/semanticInfo","proofscript/goals"]) {
  assert.ok(extension.includes(supported), "missing active editor method " + supported);
}
for (const unsupported of ["textDocument/signatureHelp","textDocument/codeAction","proofscript/proofState"]) {
  assert.equal(extension.includes(unsupported), false, "unsupported method leaked into active editor: " + unsupported);
}
assert.match(lsp,/completionProvider/u);
assert.match(lsp,/this\.worker\.completion/u);
assert.match(lsp,/definitionProvider:\s*true/u);
assert.match(lsp,/referencesProvider:\s*true/u);
assert.match(lsp,/renameProvider:\s*true/u);
assert.match(lsp,/this\.worker\.definition/u);
assert.match(lsp,/this\.worker\.references/u);
assert.match(lsp,/this\.worker\.rename/u);
assert.match(lsp,/semanticTokensProvider/u);
assert.match(lsp,/this\.worker\.semanticTokens/u);
assert.match(lsp,/documentFormattingProvider:\s*true/u);
assert.match(lsp,/this\.worker\.formatDocument/u);
assert.match(lsp,/goalPresentationAvailable:\s*true/u);
assert.match(lsp,/this\.worker\.goals/u);
assert.match(extension,/client\.request\("proofscript\/goals"/u);
assert.match(extension,/tacticStateAvailable=false/u);
assert.match(extension,/registerDocumentFormattingEditProvider/u);
assert.equal(extension.includes("EXPECTED_LSP_PROTOCOL_VERSION = 1"), true);
assert.match(JSON.stringify(grammar),/frame/u);
assert.match(JSON.stringify(grammar),/decreases/u);

const donor = fs.readFileSync(path.join(root,"donors/editors/vscode/src/extension.js"),"utf8");
assert.ok(donor.includes("textDocument/completion"));
assert.ok(donor.includes("proofscript/proofState"));
assert.ok(donor.length > extension.length, "active editor should be a bounded subset of the donor until semantic APIs are ported");

console.log("PRODUCT_V1_EDITOR_ADAPTER_TESTS=PASS");
