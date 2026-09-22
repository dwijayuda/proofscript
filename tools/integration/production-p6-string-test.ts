import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkCoreDeclarations } from '@proofscript/kernel';
import { decodeArtifact } from '@proofscript/kernel-codec';
import { verifyFile } from '@proofscript/verifier';
import { loadStandardBootstrap, stripStandardBootstrap } from '@proofscript/environment';
import { emitLeanArtifact } from '@proofscript/lean-export';
import { checkUnifiedSource, UNIFIED_INTEGRATION_PROFILE } from '@proofscript/unified-bridge';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = fs.readFileSync(path.join(root, 'integration-fixtures/production-p6/string.ps'), 'utf8');
const checked = checkUnifiedSource(source);
assert.equal(checked.integrationProfile, UNIFIED_INTEGRATION_PROFILE);
assert.equal(checked.integrationProfile, 'PRODUCTION-P6-bounded-string');
assert.equal(checked.kernelSummary.status, 'accepted');
const standardBootstrapAxioms = loadStandardBootstrap().artifact.declarations
  .filter((declaration) => declaration.kind === 'axiom')
  .map((declaration) => declaration.name)
  .sort();
assert.deepEqual(
  [...checked.kernelSummary.assumptions].sort(),
  standardBootstrapAxioms,
  'P6 string fixture should depend only on the explicit checked-bootstrap runtime-helper axioms',
);
assert.equal(
  checked.kernelSummary.assumptions.some((name) => name.startsWith('ProofScript.Core.P6.String')),
  false,
  'P6 string fixture must not add hidden String-family axioms',
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeLength(s: String): Nat := { String.length(s) }'),
  /literal-only String.length|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeUtf8ByteSize(s: String): Nat := { String.utf8ByteSize(s) }'),
  /literal-only String.utf8ByteSize|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeIsEmpty(s: String): Bool := { String.isEmpty(s) }'),
  /literal-only String.isEmpty|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeIsNat(s: String): Bool := { String.isNat(s) }'),
  /literal-only String.isNat|literal operands|literal/,
);


assert.throws(
  () => checkUnifiedSource('def badRuntimeStartsWith(s: String): Bool := { String.startsWith(s, "he") }'),
  /literal-only String.startsWith|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeStartsWithNeedle(s: String): Bool := { String.startsWith("hello", s) }'),
  /literal-only String.startsWith|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeEndsWith(s: String): Bool := { String.endsWith(s, "lo") }'),
  /literal-only String.endsWith|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeEndsWithNeedle(s: String): Bool := { String.endsWith("hello", s) }'),
  /literal-only String.endsWith|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeContains(s: String): Bool := { String.contains(s, "ell") }'),
  /literal-only String.contains|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeContainsNeedle(s: String): Bool := { String.contains("hello", s) }'),
  /literal-only String.contains|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeIsPrefixOfSubject(s: String): Bool := { String.isPrefixOf("he", s) }'),
  /literal-only String.isPrefixOf|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeIsPrefixOfPrefix(s: String): Bool := { String.isPrefixOf(s, "hello") }'),
  /literal-only String.isPrefixOf|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeBeqLeft(s: String): Bool := { String.beq(s, "hello") }'),
  /literal-only String.beq|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeBeqRight(s: String): Bool := { String.beq("hello", s) }'),
  /literal-only String.beq|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeStripPrefixSubject(s: String): String := { String.stripPrefix(s, "he") }'),
  /literal-only String.stripPrefix|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeStripPrefixPrefix(s: String): String := { String.stripPrefix("hello", s) }'),
  /literal-only String.stripPrefix|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeStripSuffixSubject(s: String): String := { String.stripSuffix(s, "lo") }'),
  /literal-only String.stripSuffix|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeStripSuffixSuffix(s: String): String := { String.stripSuffix("hello", s) }'),
  /literal-only String.stripSuffix|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeAppend(s: String): String := { String.append(s, "!") }'),
  /literal-only String.append|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeTakeSubject(s: String): String := { String.take(s, 1) }'),
  /literal-only String.take|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeTakeCount(n: Nat): String := { String.take("hello", n) }'),
  /literal-only Nat|String.take|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeDropSubject(s: String): String := { String.drop(s, 1) }'),
  /literal-only String.drop|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeDropCount(n: Nat): String := { String.drop("hello", n) }'),
  /literal-only Nat|String.drop|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeTakeRightSubject(s: String): String := { String.takeRight(s, 1) }'),
  /literal-only String.takeRight|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeTakeRightCount(n: Nat): String := { String.takeRight("hello", n) }'),
  /literal-only Nat|String.takeRight|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeDropRightSubject(s: String): String := { String.dropRight(s, 1) }'),
  /literal-only String.dropRight|literal operands|literal/,
);

assert.throws(
  () => checkUnifiedSource('def badRuntimeDropRightCount(n: Nat): String := { String.dropRight("hello", n) }'),
  /literal-only Nat|String.dropRight|literal operands|literal/,
);


const stringDecl = checked.coreArtifact.declarations.find((d) => d.kind === 'inductive' && d.name === 'ProofScript.Core.P6.String');
assert.ok(stringDecl && stringDecl.kind === 'inductive', 'missing checked Core P6 String inductive');
assert.equal(stringDecl.numParams, 0);
assert.equal(stringDecl.numIndices, 0);
assert.equal(stringDecl.constructors.length, 13);
const stringBeq = checked.coreArtifact.declarations.find((d) => d.kind === 'definition' && d.name === 'ProofScript.Core.P6.String.beq');
assert.ok(stringBeq && stringBeq.kind === 'definition', 'missing checked Core P6 String.beq definition');
assert.ok(stringDecl.constructors.every((ctor) => ctor.name.startsWith('ProofScript.Core.P6.String.lit_')));
for (const name of ['hello', 'yes', 'no', 'choose', 'idString', 'pass', 'captured', 'capturedResult', 'sameYes', 'eqTrue', 'eqFalse', 'branchOnEq', 'branchEqTrue', 'branchEqFalse', 'letterA1', 'letterA2', 'letterA3', 'escapedLiteralSame1', 'escapedLiteralSame2', 'literalConcat', 'literalConcatSame', 'literalConcatExisting', 'literalConcatExistingSame', 'literalConcatEscaped', 'literalConcatEscapedSame', 'literalLength', 'escapedLength', 'concatLength', 'asciiUtf8ByteSize', 'unicodeUtf8ByteSize', 'concatUtf8ByteSize', 'empty', 'isEmptyTrue', 'isEmptyFalse', 'isEmptyConcatFalse', 'isEmptyConcatTrue', 'startsWithTrue', 'startsWithFalse', 'startsWithConcatTrue', 'startsWithEmptyPrefix', 'endsWithTrue', 'endsWithFalse', 'endsWithConcatTrue', 'endsWithEmptySuffix', 'containsTrue', 'containsFalse', 'containsConcatTrue', 'containsEmptyNeedle', 'containsEscapedTrue', 'isPrefixOfTrue', 'isPrefixOfFalse', 'isPrefixOfConcatTrue', 'isPrefixOfEmptyPrefix', 'stringBeqTrue', 'stringBeqFalse', 'stringBeqConcatTrue', 'stringBeqSliceTrue', 'literalAppendFunction', 'literalAppendFunctionSame', 'nestedAppendLength', 'nestedAppendContains', 'literalTake', 'literalDrop', 'takeOversize', 'dropOversize', 'takeUnicode', 'dropUnicode', 'nestedTakeFromAppend', 'nestedDropFromConcat', 'literalTakeRight', 'literalDropRight', 'takeRightOversize', 'dropRightOversize', 'takeRightUnicode', 'dropRightUnicode', 'nestedTakeRightFromAppend', 'nestedDropRightFromConcat', 'stripPrefixHit', 'stripPrefixMiss', 'stripPrefixConcatHit', 'stripSuffixHit', 'stripSuffixMiss', 'stripSuffixConcatHit', 'isNatEmpty', 'isNatZero', 'isNatLeadingZero', 'isNatDigits', 'isNatNegative', 'isNatSpace', 'isNatHex', 'isNatConcat']) {
  assert.ok(checked.coreArtifact.declarations.some((d) => d.name === name), `missing ${name}`);
}

assert.match(checked.typescript, /export function hello\(\): string/);
assert.match(checked.typescript, /return "hello";/);
assert.match(checked.typescript, /export function choose\(b: boolean\): string/);
assert.match(checked.typescript, /return \(b \? "yes" : "no"\);/);
assert.match(checked.typescript, /export function captured\(suffix: string\): \(arg: string\) => string/);
assert.match(checked.typescript, /export function sameYes\(s: string\): boolean/);
assert.match(checked.typescript, /return \(s === "yes"\);/);
assert.match(checked.typescript, /export function branchOnEq\(s: string\): string/);
assert.match(checked.typescript, /return \(\(s === "yes"\) \? "yes" : "no"\);/);
assert.match(checked.typescript, /export function literalLength\(\): bigint/);
assert.match(checked.typescript, /return 5n;/);
assert.match(checked.typescript, /export function escapedLength\(\): bigint/);
assert.match(checked.typescript, /return 1n;/);
assert.match(checked.typescript, /export function asciiUtf8ByteSize\(\): bigint/);
assert.match(checked.typescript, /export function unicodeUtf8ByteSize\(\): bigint/);
assert.match(checked.typescript, /export function concatUtf8ByteSize\(\): bigint/);
assert.match(checked.typescript, /export function isEmptyTrue\(\): boolean/);
assert.match(checked.typescript, /return true;/);
assert.match(checked.typescript, /export function isEmptyFalse\(\): boolean/);
assert.match(checked.typescript, /return false;/);
assert.match(checked.typescript, /export function isNatEmpty\(\): boolean/);
assert.match(checked.typescript, /export function isNatZero\(\): boolean/);
assert.match(checked.typescript, /export function isNatConcat\(\): boolean/);

assert.match(checked.typescript, /export function startsWithTrue\(\): boolean/);
assert.match(checked.typescript, /export function startsWithFalse\(\): boolean/);
assert.match(checked.typescript, /export function endsWithTrue\(\): boolean/);
assert.match(checked.typescript, /export function endsWithFalse\(\): boolean/);
assert.match(checked.typescript, /export function containsTrue\(\): boolean/);
assert.match(checked.typescript, /export function containsFalse\(\): boolean/);
assert.match(checked.typescript, /export function isPrefixOfTrue\(\): boolean/);
assert.match(checked.typescript, /export function isPrefixOfFalse\(\): boolean/);
assert.match(checked.typescript, /export function stringBeqTrue\(\): boolean/);
assert.match(checked.typescript, /export function stringBeqFalse\(\): boolean/);
assert.match(checked.typescript, /export function stringBeqConcatTrue\(\): boolean/);
assert.match(checked.typescript, /export function stringBeqSliceTrue\(\): boolean/);
assert.match(checked.typescript, /export function literalAppendFunction\(\): string/);
assert.match(checked.typescript, /export function nestedAppendLength\(\): bigint/);
assert.match(checked.typescript, /export function nestedAppendContains\(\): boolean/);

assert.match(checked.typescript, /export function literalTake\(\): string/);
assert.match(checked.typescript, /export function literalDrop\(\): string/);
assert.match(checked.typescript, /export function nestedTakeFromAppend\(\): string/);
assert.match(checked.typescript, /export function nestedDropFromConcat\(\): string/);
assert.match(checked.typescript, /export function literalTakeRight\(\): string/);
assert.match(checked.typescript, /export function literalDropRight\(\): string/);
assert.match(checked.typescript, /export function nestedTakeRightFromAppend\(\): string/);
assert.match(checked.typescript, /export function nestedDropRightFromConcat\(\): string/);
assert.match(checked.typescript, /export function stripPrefixHit\(\): string/);
assert.match(checked.typescript, /export function stripPrefixMiss\(\): string/);
assert.match(checked.typescript, /export function stripPrefixConcatHit\(\): string/);
assert.match(checked.typescript, /export function stripSuffixHit\(\): string/);
assert.match(checked.typescript, /export function stripSuffixMiss\(\): string/);
assert.match(checked.typescript, /export function stripSuffixConcatHit\(\): string/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p6-string-'));
try {
  const artifactPath = path.join(tmp, 'p6-string.pscore.json');
  fs.writeFileSync(artifactPath, JSON.stringify(checked.coreArtifact, null, 2) + '\n');
  decodeArtifact(JSON.parse(fs.readFileSync(artifactPath, 'utf8')));
  const replay = verifyFile(artifactPath, new Set(standardBootstrapAxioms));
  assert.equal(replay.status, 'accepted');
  assert.equal(replay.projectPluginsLoaded, false);

  fs.writeFileSync(path.join(tmp, 'p6.ts'), `${checked.typescript}\nconsole.log('HELLO=' + hello());\nconsole.log('T=' + choose(true));\nconsole.log('F=' + choose(false));\nconsole.log('PASS=' + pass());\nconsole.log('CAP=' + capturedResult());\nconsole.log('EQT=' + eqTrue());\nconsole.log('EQF=' + eqFalse());\nconsole.log('BT=' + branchEqTrue());\nconsole.log('BF=' + branchEqFalse());\nconsole.log('ESC1=' + escapedLiteralSame1());\nconsole.log('ESC2=' + escapedLiteralSame2());\nconsole.log('CONCAT=' + literalConcat());\nconsole.log('CONCATEQ=' + literalConcatSame());\nconsole.log('CONCATEX=' + literalConcatExisting());\nconsole.log('CONCATEXEQ=' + literalConcatExistingSame());\nconsole.log('CONCATES=' + literalConcatEscaped());\nconsole.log('CONCATESEQ=' + literalConcatEscapedSame());\nconsole.log('LEN=' + literalLength());\nconsole.log('LENESC=' + escapedLength());\nconsole.log('LENCON=' + concatLength());\nconsole.log('UTF8ASCII=' + asciiUtf8ByteSize());\nconsole.log('UTF8UNI=' + unicodeUtf8ByteSize());\nconsole.log('UTF8CON=' + concatUtf8ByteSize());\nconsole.log('EMPTY=' + empty());\nconsole.log('ISEMPTYT=' + isEmptyTrue());\nconsole.log('ISEMPTYF=' + isEmptyFalse());\nconsole.log('ISEMPTYCONTF=' + isEmptyConcatFalse());\nconsole.log('ISEMPTYCONTT=' + isEmptyConcatTrue());\nconsole.log('STARTT=' + startsWithTrue());\nconsole.log('STARTF=' + startsWithFalse());\nconsole.log('STARTCONT=' + startsWithConcatTrue());\nconsole.log('STARTEMPTY=' + startsWithEmptyPrefix());\nconsole.log('ENDT=' + endsWithTrue());\nconsole.log('ENDF=' + endsWithFalse());\nconsole.log('ENDCONT=' + endsWithConcatTrue());\nconsole.log('ENDEMPTY=' + endsWithEmptySuffix());\nconsole.log('CONTAINST=' + containsTrue());\nconsole.log('CONTAINSF=' + containsFalse());\nconsole.log('CONTAINSCONT=' + containsConcatTrue());\nconsole.log('CONTAINSEMPTY=' + containsEmptyNeedle());\nconsole.log('CONTAINSESC=' + containsEscapedTrue());\nconsole.log('PREFIXOFT=' + isPrefixOfTrue());\nconsole.log('PREFIXOFF=' + isPrefixOfFalse());\nconsole.log('PREFIXOFCONT=' + isPrefixOfConcatTrue());\nconsole.log('PREFIXOFEMPTY=' + isPrefixOfEmptyPrefix());\nconsole.log('STRBEQT=' + stringBeqTrue());\nconsole.log('STRBEQF=' + stringBeqFalse());\nconsole.log('STRBEQCON=' + stringBeqConcatTrue());\nconsole.log('STRBEQSLICE=' + stringBeqSliceTrue());\nconsole.log('APPENDFN=' + literalAppendFunction());\nconsole.log('APPENDFNEQ=' + literalAppendFunctionSame());\nconsole.log('NESTLEN=' + nestedAppendLength());\nconsole.log('NESTCONTAINS=' + nestedAppendContains());\nconsole.log('TAKE=' + literalTake());\nconsole.log('DROP=' + literalDrop());\nconsole.log('TAKEBIG=' + takeOversize());\nconsole.log('DROPBIG=' + dropOversize());\nconsole.log('TAKEUNI=' + takeUnicode());\nconsole.log('DROPUNI=' + dropUnicode());\nconsole.log('NESTTAKE=' + nestedTakeFromAppend());\nconsole.log('NESTDROP=' + nestedDropFromConcat());\nconsole.log('TAKERIGHT=' + literalTakeRight());\nconsole.log('DROPRIGHT=' + literalDropRight());\nconsole.log('TAKERIGHTBIG=' + takeRightOversize());\nconsole.log('DROPRIGHTBIG=' + dropRightOversize());\nconsole.log('TAKERIGHTUNI=' + takeRightUnicode());\nconsole.log('DROPRIGHTUNI=' + dropRightUnicode());\nconsole.log('NESTTAKERIGHT=' + nestedTakeRightFromAppend());\nconsole.log('NESTDROPRIGHT=' + nestedDropRightFromConcat());\nconsole.log('STRIPHIT=' + stripPrefixHit());\nconsole.log('STRIPMISS=' + stripPrefixMiss());\nconsole.log('STRIPCON=' + stripPrefixConcatHit());\nconsole.log('STRIPSUFHIT=' + stripSuffixHit());\nconsole.log('STRIPSUFMISS=' + stripSuffixMiss());\nconsole.log('STRIPSUFCON=' + stripSuffixConcatHit());\nconsole.log('ISNATEMPTY=' + isNatEmpty());\nconsole.log('ISNATZERO=' + isNatZero());\nconsole.log('ISNATLEADING=' + isNatLeadingZero());\nconsole.log('ISNATDIGITS=' + isNatDigits());\nconsole.log('ISNATNEG=' + isNatNegative());\nconsole.log('ISNATSPACE=' + isNatSpace());\nconsole.log('ISNATHEX=' + isNatHex());\nconsole.log('ISNATCONCAT=' + isNatConcat());\n`);
  fs.writeFileSync(path.join(tmp, 'package.json'), '{"type":"module"}\n');
  const tsc = spawnSync('tsc', ['p6.ts', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--outDir', 'js'], { cwd: tmp, encoding: 'utf8' });
  assert.equal(tsc.status, 0, tsc.stderr || tsc.stdout);
  const runtime = spawnSync(process.execPath, [path.join(tmp, 'js/p6.js')], { encoding: 'utf8' });
  assert.equal(runtime.status, 0, runtime.stderr || runtime.stdout);
  assert.deepEqual(runtime.stdout.trim().split(/\r?\n/), ['HELLO=hello', 'T=yes', 'F=no', 'PASS=hello', 'CAP=yes', 'EQT=true', 'EQF=false', 'BT=yes', 'BF=no', 'ESC1=true', 'ESC2=true', 'CONCAT=hello', 'CONCATEQ=true', 'CONCATEX=yes', 'CONCATEXEQ=true', 'CONCATES=AB', 'CONCATESEQ=true', 'LEN=5', 'LENESC=1', 'LENCON=5', 'UTF8ASCII=5', 'UTF8UNI=3', 'UTF8CON=4', 'EMPTY=', 'ISEMPTYT=true', 'ISEMPTYF=false', 'ISEMPTYCONTF=false', 'ISEMPTYCONTT=true', 'STARTT=true', 'STARTF=false', 'STARTCONT=true', 'STARTEMPTY=true', 'ENDT=true', 'ENDF=false', 'ENDCONT=true', 'ENDEMPTY=true', 'CONTAINST=true', 'CONTAINSF=false', 'CONTAINSCONT=true', 'CONTAINSEMPTY=true', 'CONTAINSESC=true', 'PREFIXOFT=true', 'PREFIXOFF=false', 'PREFIXOFCONT=true', 'PREFIXOFEMPTY=true', 'STRBEQT=true', 'STRBEQF=false', 'STRBEQCON=true', 'STRBEQSLICE=true', 'APPENDFN=hello', 'APPENDFNEQ=true', 'NESTLEN=3', 'NESTCONTAINS=true', 'TAKE=he', 'DROP=llo', 'TAKEBIG=hello', 'DROPBIG=', 'TAKEUNI=∀', 'DROPUNI=bc', 'NESTTAKE=he', 'NESTDROP=llo', 'TAKERIGHT=lo', 'DROPRIGHT=hel', 'TAKERIGHTBIG=hello', 'DROPRIGHTBIG=', 'TAKERIGHTUNI=∀', 'DROPRIGHTUNI=ab', 'NESTTAKERIGHT=lo', 'NESTDROPRIGHT=hel', 'STRIPHIT=llo', 'STRIPMISS=hello', 'STRIPCON=llo', 'STRIPSUFHIT=hel', 'STRIPSUFMISS=hello', 'STRIPSUFCON=hel', 'ISNATEMPTY=false', 'ISNATZERO=true', 'ISNATLEADING=true', 'ISNATDIGITS=true', 'ISNATNEG=false', 'ISNATSPACE=false', 'ISNATHEX=false', 'ISNATCONCAT=true']);

  const leanBin = process.env.PROOFSCRIPT_LEAN_BIN;
  if (leanBin) {
    const ver = spawnSync(leanBin, ['--version'], { encoding: 'utf8' });
    assert.equal(ver.status, 0, ver.stderr || ver.stdout);
    assert.match(ver.stdout, /version 4\.33\.1,/);
    assert.match(ver.stdout, /819816b2e0a3bf405af45ae5c7af2491d8f5bee6/);
    const stripped = stripStandardBootstrap(checked.coreArtifact) ?? checked.coreArtifact;
    const leanPath = path.join(tmp, 'p6.lean');
    fs.writeFileSync(leanPath, `${emitLeanArtifact(stripped)}\n#reduce hello\n#reduce choose Bool.true\n#reduce choose Bool.false\n#reduce pass\n#reduce capturedResult\n#reduce eqTrue\n#reduce eqFalse\n#reduce branchEqTrue\n#reduce branchEqFalse\n#reduce escapedLiteralSame1\n#reduce escapedLiteralSame2\n#reduce literalConcat\n#reduce literalConcatSame\n#reduce literalConcatExisting\n#reduce literalConcatExistingSame\n#reduce literalConcatEscaped\n#reduce literalConcatEscapedSame\n#reduce literalLength\n#reduce escapedLength\n#reduce concatLength\n#reduce asciiUtf8ByteSize\n#reduce unicodeUtf8ByteSize\n#reduce concatUtf8ByteSize\n#reduce empty\n#reduce isEmptyTrue\n#reduce isEmptyFalse\n#reduce isEmptyConcatFalse\n#reduce isEmptyConcatTrue\n#reduce startsWithTrue\n#reduce startsWithFalse\n#reduce startsWithConcatTrue\n#reduce startsWithEmptyPrefix\n#reduce endsWithTrue\n#reduce endsWithFalse\n#reduce endsWithConcatTrue\n#reduce endsWithEmptySuffix\n#reduce containsTrue\n#reduce containsFalse\n#reduce containsConcatTrue\n#reduce containsEmptyNeedle\n#reduce containsEscapedTrue\n#reduce isPrefixOfTrue\n#reduce isPrefixOfFalse\n#reduce isPrefixOfConcatTrue\n#reduce isPrefixOfEmptyPrefix\n#reduce stringBeqTrue\n#reduce stringBeqFalse\n#reduce stringBeqConcatTrue\n#reduce stringBeqSliceTrue\n#reduce literalAppendFunction\n#reduce literalAppendFunctionSame\n#reduce nestedAppendLength\n#reduce nestedAppendContains\n#reduce literalTake\n#reduce literalDrop\n#reduce takeOversize\n#reduce dropOversize\n#reduce takeUnicode\n#reduce dropUnicode\n#reduce nestedTakeFromAppend\n#reduce nestedDropFromConcat\n#reduce literalTakeRight\n#reduce literalDropRight\n#reduce takeRightOversize\n#reduce dropRightOversize\n#reduce takeRightUnicode\n#reduce dropRightUnicode\n#reduce nestedTakeRightFromAppend\n#reduce nestedDropRightFromConcat\n#reduce stripPrefixHit\n#reduce stripPrefixMiss\n#reduce stripPrefixConcatHit\n#reduce stripSuffixHit\n#reduce stripSuffixMiss\n#reduce stripSuffixConcatHit\n#reduce isNatEmpty\n#reduce isNatZero\n#reduce isNatLeadingZero\n#reduce isNatDigits\n#reduce isNatNegative\n#reduce isNatSpace\n#reduce isNatHex\n#reduce isNatConcat\n`);
    const lean = spawnSync(leanBin, [leanPath], { encoding: 'utf8', env: { ...process.env, TERM: 'xterm' } });
    assert.equal(lean.status, 0, lean.stderr || lean.stdout);
    const clean = lean.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    const tail = clean.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(-83);
    assert.equal(tail.length, 83);
    assert.ok(tail[0].includes('lit_'));
    assert.ok(tail[1].includes('lit_'));
    assert.ok(tail[2].includes('lit_'));
    assert.equal(tail[0], tail[3]);
    assert.equal(tail[1], tail[4]);
    assert.notEqual(tail[1], tail[2]);
    assert.equal(tail[5], 'true');
    assert.equal(tail[6], 'false');
    assert.equal(tail[7], tail[1]);
    assert.equal(tail[8], tail[2]);
    assert.equal(tail[9], 'true');
    assert.equal(tail[10], 'true');
    assert.equal(tail[11], tail[0]);
    assert.equal(tail[12], 'true');
    assert.equal(tail[13], tail[1]);
    assert.equal(tail[14], 'true');
    assert.ok(tail[15].includes('lit_'));
    assert.equal(tail[16], 'true');
    assert.equal(tail[17], '5');
    assert.equal(tail[18], '1');
    assert.equal(tail[19], '5');
    assert.equal(tail[20], '5');
    assert.equal(tail[21], '3');
    assert.equal(tail[22], '4');
    assert.ok(tail[23].includes('lit_'));
    assert.equal(tail[24], 'true');
    assert.equal(tail[25], 'false');
    assert.equal(tail[26], 'false');
    assert.equal(tail[27], 'true');
    assert.equal(tail[28], 'true');
    assert.equal(tail[29], 'false');
    assert.equal(tail[30], 'true');
    assert.equal(tail[31], 'true');
    assert.equal(tail[32], 'true');
    assert.equal(tail[33], 'false');
    assert.equal(tail[34], 'true');
    assert.equal(tail[35], 'true');
    assert.equal(tail[36], 'true');
    assert.equal(tail[37], 'false');
    assert.equal(tail[38], 'true');
    assert.equal(tail[39], 'true');
    assert.equal(tail[40], 'true');
    assert.equal(tail[41], 'true');
    assert.equal(tail[42], 'false');
    assert.equal(tail[43], 'true');
    assert.equal(tail[44], 'true');
    assert.equal(tail[45], 'true');
    assert.equal(tail[46], 'false');
    assert.equal(tail[47], 'true');
    assert.equal(tail[48], 'true');
    assert.equal(tail[49], tail[0]);
    assert.equal(tail[50], 'true');
    assert.equal(tail[51], '3');
    assert.equal(tail[52], 'true');
    assert.ok(tail[53].includes('lit_'));
    assert.ok(tail[54].includes('lit_'));
    assert.equal(tail[55], tail[0]);
    assert.equal(tail[56], tail[23]);
    assert.ok(tail[57].includes('lit_'));
    assert.ok(tail[58].includes('lit_'));
    assert.equal(tail[59], tail[53]);
    assert.equal(tail[60], tail[54]);
    assert.ok(tail[61].includes('lit_'));
    assert.ok(tail[62].includes('lit_'));
    assert.equal(tail[63], tail[0]);
    assert.equal(tail[64], tail[23]);
    assert.equal(tail[65], tail[57]);
    assert.ok(tail[66].includes('lit_'));
    assert.equal(tail[67], tail[61]);
    assert.equal(tail[68], tail[62]);
    assert.equal(tail[69], tail[54]);
    assert.equal(tail[70], tail[0]);
    assert.equal(tail[71], tail[54]);
    assert.equal(tail[72], tail[62]);
    assert.equal(tail[73], tail[0]);
    assert.equal(tail[74], tail[62]);
    assert.equal(tail[75], 'false');
    assert.equal(tail[76], 'true');
    assert.equal(tail[77], 'true');
    assert.equal(tail[78], 'true');
    assert.equal(tail[79], 'false');
    assert.equal(tail[80], 'false');
    assert.equal(tail[81], 'false');
    assert.equal(tail[82], 'true');
  }

  const tampered = structuredClone(checked.coreArtifact);
  const opt = tampered.declarations.find((d) => d.kind === 'inductive' && d.name === 'ProofScript.Core.P6.String');
  assert.ok(opt && opt.kind === 'inductive');
  opt.constructors[0].type = { tag: 'const', name: 'Bool', levels: [] };
  const tamperedSummary = checkCoreDeclarations(tampered.declarations, 'KERNEL-level-instantiation-conformance1');
  assert.equal(tamperedSummary.status, 'rejected');
  assert.match(tamperedSummary.message ?? '', /constructor|expected|application|codomain/i);

  const tamperedBeq = structuredClone(checked.coreArtifact);
  const beq = tamperedBeq.declarations.find((d) => d.kind === 'definition' && d.name === 'ProofScript.Core.P6.String.beq');
  assert.ok(beq && beq.kind === 'definition');
  beq.value = { tag: 'const', name: 'Bool.true', levels: [] };
  const tamperedBeqSummary = checkCoreDeclarations(tamperedBeq.declarations, 'KERNEL-level-instantiation-conformance1');
  assert.equal(tamperedBeqSummary.status, 'rejected');
  assert.match(tamperedBeqSummary.message ?? '', /type mismatch|expected|definition/i);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('✓ Production P6 bounded String: checked finite literal domain + pass/branch/closure/equality + literal concat/append/take/drop/takeRight/dropRight/length/utf8ByteSize/isEmpty/startsWith/endsWith/contains/isPrefixOf/String.beq + stripPrefix/stripSuffix + isNat + replay + TS + tamper rejection passed');
