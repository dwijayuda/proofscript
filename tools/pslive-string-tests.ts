#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildJsFixture,
  buildTsFixture,
  compileTypeScriptFixture,
  createPsliveFixture,
  expectPsliveRejected,
  requireFixtureModule,
} from './pslive-test-harness.ts';

const fixture = createPsliveFixture('proofscript-string-', {
  fileName: 'String.ps',
  source: String.raw`
def hello: String := { "hello" }
def escaped: String := { "A\nB" }
def quoteSlash: String := { "quote: \" slash: \\" }
def idString(s: String): String := { s }
def helloAgain: String := { idString("hello") }

theorem hello_rfl: hello = "hello" := by rfl
theorem escaped_rfl: escaped = "A\nB" := by rfl
`,
});

const { outPath: jsOut, result: jsResult } = buildJsFixture(fixture, 'string.js');
assert.ok(jsResult.emitted.some((d) => d.name === 'hello'), 'String literal definitions must be emitted');
const jsModule = requireFixtureModule(jsOut);
assert.equal(jsModule.hello, 'hello');
assert.equal(jsModule.escaped, 'A\nB');
assert.equal(jsModule.quoteSlash, 'quote: " slash: \\');
assert.equal(jsModule.helloAgain, 'hello');

const { outPath: tsOut } = buildTsFixture(fixture, 'string.ts');
const tsSource = fs.readFileSync(tsOut, 'utf8');
assert.match(tsSource, /export const hello: string = "hello";/, 'String literal must emit with the Product-v1 public string type');
assert.match(tsSource, /export const escaped: string = "A\\nB";/, 'escaped String literal must preserve escaping in emitted TypeScript');
const compiledJs = compileTypeScriptFixture(tsOut, fixture.path('compiled'));
const compiled = requireFixtureModule(compiledJs);
assert.equal(compiled.helloAgain, 'hello');
assert.equal(compiled.escaped, 'A\nB');

const badType = createPsliveFixture('proofscript-string-bad-type-', {
  fileName: 'BadStringType.ps',
  source: String.raw`
def bad: Nat := { "hello" }
`,
});
const wrongType = expectPsliveRejected(['check', badType.source, '--json']);
assert.match(wrongType.message, /String|Nat|literal|expected type/i);

const badEscape = createPsliveFixture('proofscript-string-bad-escape-', {
  fileName: 'BadStringEscape.ps',
  source: String.raw`
def bad: String := { "bad\q" }
`,
});
const rejectedEscape = expectPsliveRejected(['check', badEscape.source, '--json']);
assert.match(rejectedEscape.message, /unsupported string escape|ParseError|string escape/i);

console.log('PSLIVE_STRING=PASS');
