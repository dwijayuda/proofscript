#!/usr/bin/env node
import './register-local-workspace.cts';
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { tokenize } = require("../packages/parser/dist/index.js");

const tokens = tokenize("-- comment\ndef x: Nat := { 1 + 2 * 3 };\n");
assert.deepEqual(tokens.map((t) => t.text), ["def", "x", ":", "Nat", ":=", "{", "1", "+", "2", "*", "3", "}", ";", "<eof>"]);
assert.throws(() => tokenize("// bad comment"), /standard ProofScript does not use JavaScript/);
assert.throws(() => tokenize("/- unterminated"), /unterminated block comment/);
console.log("PARSER_TOKENIZE_CHARACTERIZATION=PASS");
