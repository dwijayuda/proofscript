#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildJsCommand,
  buildTsCommand,
  checkCommand,
  PSC1_TRUST_LABEL,
  runSmallSource,
} from './pslive-core.ts';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = process.argv.includes('--json');
const writeDocs = process.argv.includes('--write-docs');
const languageRef = resolve(repoRoot, 'docs/reference/ProofScript_Language_Reference_v0.6.1_authoritative_draft.md');
const grammarRef = resolve(repoRoot, 'docs/reference/ProofScript_Parser_Lowering_API_Contract_v0.6.1.md');
const PINNED = '819816b2e0a3bf405af45ae5c7af2491d8f5bee6';

function sha256Text(text) { return createHash('sha256').update(text).digest('hex'); }
function sha256File(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function ok(id, message, details = {}) { return { id, status: 'accepted', message, details }; }
function reject(id, message, details = {}) { return { id, status: 'rejected', message, details }; }
function scrubTempPaths(value) {
  if (typeof value === 'string') return value.replace(/\/tmp\/proofscript-reference-governance-[^\/]+/g, '<reference-governance-tmp>');
  if (Array.isArray(value)) return value.map(scrubTempPaths);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = scrubTempPaths(value[key]);
  return out;
}
function stableDetails(value) { return scrubTempPaths(value); }
function opt(args, name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }

async function run(args) {
  const [script, cmd, file, ...rest] = args;
  if (script === 'tools/pslive.ts') {
    try {
      let result;
      if (cmd === 'check') {
        result = checkCommand(file, { emitCore: opt(rest, '--emit-core') });
      } else if (cmd === 'build-js') {
        result = buildJsCommand(file, opt(rest, '--out'));
      } else if (cmd === 'build-ts') {
        result = buildTsCommand(file, opt(rest, '--out'));
      } else if (cmd === 'run') {
        const rawArgs = opt(rest, '--args') ?? '';
        result = await runSmallSource(file, {
          call: opt(rest, '--call'),
          args: rawArgs === '' ? [] : rawArgs.split(','),
        });
      } else {
        throw new Error(`unsupported reference-governance direct pslive command: ${cmd}`);
      }
      return { status: 0, stdout: JSON.stringify(result, null, 2) + '\n', stderr: '' };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        status: 1,
        stdout: JSON.stringify({ status: 'rejected', message, trustLabel: PSC1_TRUST_LABEL }, null, 2) + '\n',
        stderr: '',
      };
    }
  }
  return spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8', timeout: 15000, killSignal: 'SIGKILL' });
}
async function expectAccepted(id, args, checks = () => []) {
  const r = await run(args);
  if (r.status !== 0) return reject(id, 'Command rejected unexpectedly', stableDetails({ args, exitCode: r.status, stdout: r.stdout, stderr: r.stderr }));
  try {
    const parsed = JSON.parse(r.stdout);
    const extra = checks(parsed, r) ?? [];
    const failures = extra.filter(x => x.status === 'rejected');
    if (failures.length) return reject(id, 'Command accepted but semantic checks failed', stableDetails({ args, failures, stdout: r.stdout }));
    return ok(id, 'Command accepted as expected', stableDetails({ args, stdoutSha256: sha256Text(scrubTempPaths(r.stdout)), checks: extra }));
  } catch {
    return ok(id, 'Command accepted as expected', stableDetails({ args, stdoutSha256: sha256Text(scrubTempPaths(r.stdout)) }));
  }
}
async function expectRejected(id, args, pattern) {
  const r = await run(args);
  const output = `${r.stdout}\n${r.stderr}`;
  if (r.status === 0) return reject(id, 'Command accepted but should reject', stableDetails({ args, stdout: r.stdout, stderr: r.stderr }));
  if (pattern && !pattern.test(output)) return reject(id, 'Command rejected with the wrong diagnostic', stableDetails({ args, output, expected: String(pattern) }));
  return ok(id, 'Command rejected as expected', stableDetails({ args, exitCode: r.status, outputSha256: sha256Text(scrubTempPaths(output)) }));
}

const checks = [];
const add = c => checks.push(c);

if (!existsSync(languageRef)) add(reject('reference.language.present', 'Language reference file is missing from docs/reference'));
else {
  const text = readFileSync(languageRef, 'utf8');
  add(text.includes('Authoritative draft v0.6.1') && text.includes('Lean 4.33.1') && text.includes(PINNED)
    ? ok('reference.language.pinned-baseline', 'Language reference v0.6.1 pins Lean 4.33.1 and exact revision', { sha256: sha256File(languageRef) })
    : reject('reference.language.pinned-baseline', 'Language reference v0.6.1 does not contain the expected pinned baseline/revision'));
  add(text.includes('TypeScript-friendly syntax where it helps; Lean semantics wherever it matters') && text.includes('S1 specified')
    ? ok('reference.language.v061-principle-and-claim-ceiling', 'Language reference v0.6.1 principle and S1 claim ceiling are present')
    : reject('reference.language.v061-principle-and-claim-ceiling', 'Language reference v0.6.1 principle/claim ceiling are missing'));
}

if (!existsSync(grammarRef)) add(reject('reference.grammar.present', 'Grammar/parser reference file is missing from docs/reference'));
else {
  const text = readFileSync(grammarRef, 'utf8');
  add(text.includes('Parser and Lowering API Contract') && text.includes('v0.6.1') && text.includes('SurfaceFeatureId')
    ? ok('reference.grammar.dynamic-parser-baseline', 'Parser/lowering API contract v0.6.1 is present', { sha256: sha256File(grammarRef) })
    : reject('reference.grammar.dynamic-parser-baseline', 'Parser/lowering API contract v0.6.1 is missing expected sections'));
  add(text.includes('D-CONST-ALIAS') && text.includes('D-FUNCTION-ALIAS') && text.includes('E-IF-BRACE')
    ? ok('reference.grammar.psc1-alias-comment-rules', 'Parser/lowering API contract lists v0.6.1 alias and braced-if feature IDs')
    : reject('reference.grammar.psc1-alias-comment-rules', 'Parser/lowering API contract lacks expected v0.6.1 feature IDs'));
}

const dir = mkdtempSync(join(tmpdir(), 'proofscript-reference-governance-'));
const good = join(dir, 'ReferenceGoverned.ps');
const goodJs = join(dir, 'reference-governed.js');
writeFileSync(good, `-- Reference-governed PSC-1 smoke: comments use Lean-compatible --.
const two: Nat := { 2 }
function add2(x: Nat): Nat := { Nat.add(x, 2) }
function choose(b: Bool): Nat := { bif (b) { 1 } else { 2 } }
function chooseIf(b: Bool): Nat := { if b then 1 else 2 }
function chooseMatch(b: Bool): Nat := { match (b) { | true => 1 | false => 2 } }
function isZeroMatch(n: Nat): Bool := { match (n) { | 0 => true | _ => false } }
function natTagMatch(n: Nat): Nat := { match (n) { | 0 => 10 | 1 => 20 | 2 => 30 | _ => 40 } }
function predLeanStyle(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k => k } }
function predShortSucc(n: Nat): Nat := { match (n) { | 0 => 0 | succ k => k } }
def withLet: Nat := { let x: Nat := add2(2); add2(x) }
def withInferredLet: Nat := { let x := 2; add2(x) }
def withHave: Nat := { have x: Nat := 2; add2(x) }
inductive Tiny: Type where {
  | mk
}
inductive Color: Type where { | red | green | blue }
inductive MaybeNat: Type where { | none | some (value: Nat) }
def redColor: Color := { Color.red }
def greenColor: Color := { Color.green }
def blueColor: Color := { Color.blue }
function colorCode(c: Color): Nat := { match (c) { | Color.red => 1 | Color.green => 2 | Color.blue => 3 } }
def redCode: Nat := { colorCode(redColor) }
def greenCode: Nat := { colorCode(greenColor) }
def blueCode: Nat := { colorCode(blueColor) }
def maybeNone: MaybeNat := { MaybeNat.none }
def maybeSome: MaybeNat := { MaybeNat.some(7) }
function maybeDefault(m: MaybeNat): Nat := { match (m) { | MaybeNat.none => 0 | MaybeNat.some value => value } }
def noneDefault: Nat := { maybeDefault(maybeNone) }
def someDefault: Nat := { maybeDefault(maybeSome) }
structure Point: Type where {
  x: Nat;
  y: Nat;
}
structure Box: Type where {
  p: Point;
  label: Nat;
}
def point: Point := { {x := 1, y := 2} }
function mkLiteralPunnedPoint(x: Nat, y: Nat): Point := { {x, y} }
def literalPunnedPoint: Point := { mkLiteralPunnedPoint(4, 5) }
def literalPunnedX: Nat := { literalPunnedPoint.x }
def literalPunnedY: Nat := { literalPunnedPoint.y }
def pointX: Nat := { Point.x(point) }
def pointY: Nat := { Point.y(point) }
def pointDotX: Nat := { point.x }
def pointDotY: Nat := { point.y }
def pointMoved: Point := { {point with x := 3} }
def pointMovedX: Nat := { pointMoved.x }
def pointMovedY: Nat := { pointMoved.y }
function setX(p: Point, x: Nat): Point := { {p with x} }
def pointPunned: Point := { setX(point, 6) }
def pointPunnedX: Nat := { pointPunned.x }
def pointPunnedY: Nat := { pointPunned.y }
function matchPointX(p: Point): Nat := { match (p) { | Point.mk x y => x } }
function matchPointY(p: Point): Nat := { match (p) { | Point.mk x y => y } }
def matchedX: Nat := { matchPointX(point) }
def matchedY: Nat := { matchPointY(point) }
def box: Box := { {p := point, label := 9} }
def boxMoved: Box := { {box with p.x := 7} }
def boxMovedBoth: Box := { {box with p.x := 8, p.y := 6} }
def boxMovedX: Nat := { boxMoved.p.x }
def boxMovedY: Nat := { boxMoved.p.y }
def boxMovedLabel: Nat := { boxMoved.label }
def boxMovedBothX: Nat := { boxMovedBoth.p.x }
def boxMovedBothY: Nat := { boxMovedBoth.p.y }
def pointFromParenBase: Point := { {(point) with x := 4} }
def pointFromDottedParenBase: Point := { {(box.p) with y := 6} }
def parenBaseX: Nat := { pointFromParenBase.x }
def parenBaseY: Nat := { pointFromParenBase.y }
def dottedParenBaseX: Nat := { pointFromDottedParenBase.x }
def dottedParenBaseY: Nat := { pointFromDottedParenBase.y }
theorem red_code_eq_one: redCode = 1 := by { rfl }
theorem green_code_eq_two: greenCode = 2 := by { rfl }
theorem blue_code_eq_three: blueCode = 3 := by { rfl }
theorem none_default_eq_zero: noneDefault = 0 := by { rfl }
theorem some_default_eq_seven: someDefault = 7 := by { rfl }
theorem point_x_eq_one: pointX = 1 := by { rfl }
theorem point_y_eq_two: pointY = 2 := by { rfl }
theorem literal_punned_x_eq_four: literalPunnedX = 4 := by { rfl }
theorem literal_punned_y_eq_five: literalPunnedY = 5 := by { rfl }
theorem point_dot_x_eq_one: pointDotX = 1 := by { rfl }
theorem point_dot_y_eq_two: pointDotY = 2 := by { rfl }
theorem point_moved_x_eq_three: pointMovedX = 3 := by { rfl }
theorem point_moved_y_eq_two: pointMovedY = 2 := by { rfl }
theorem point_punned_x_eq_six: pointPunnedX = 6 := by { rfl }
theorem point_punned_y_eq_two: pointPunnedY = 2 := by { rfl }
theorem matched_x_eq_one: matchedX = 1 := by { rfl }
theorem matched_y_eq_two: matchedY = 2 := by { rfl }
theorem box_moved_x_eq_seven: boxMovedX = 7 := by { rfl }
theorem box_moved_y_eq_two: boxMovedY = 2 := by { rfl }
theorem box_moved_label_eq_nine: boxMovedLabel = 9 := by { rfl }
theorem box_moved_both_x_eq_eight: boxMovedBothX = 8 := by { rfl }
theorem box_moved_both_y_eq_six: boxMovedBothY = 6 := by { rfl }
theorem paren_base_x_eq_four: parenBaseX = 4 := by { rfl }
theorem paren_base_y_eq_two: parenBaseY = 2 := by { rfl }
theorem dotted_paren_base_x_eq_one: dottedParenBaseX = 1 := by { rfl }
theorem dotted_paren_base_y_eq_six: dottedParenBaseY = 6 := by { rfl }
theorem add2_two_eq_four: add2(2) = 4 := by { rfl }
theorem choose_true_eq_one: choose(true) = 1 := by { rfl }
theorem choose_false_eq_two: choose(false) = 2 := by { rfl }
theorem choose_if_true_eq_one: chooseIf(true) = 1 := by { rfl }
theorem choose_if_false_eq_two: chooseIf(false) = 2 := by { rfl }
theorem choose_match_true_eq_one: chooseMatch(true) = 1 := by { rfl }
theorem choose_match_false_eq_two: chooseMatch(false) = 2 := by { rfl }
theorem is_zero_match_zero_eq_true: isZeroMatch(0) = true := by { rfl }
theorem is_zero_match_one_eq_false: isZeroMatch(1) = false := by { rfl }
theorem nat_tag_match_zero_eq_ten: natTagMatch(0) = 10 := by { rfl }
theorem nat_tag_match_one_eq_twenty: natTagMatch(1) = 20 := by { rfl }
theorem nat_tag_match_two_eq_thirty: natTagMatch(2) = 30 := by { rfl }
theorem nat_tag_match_large_eq_forty: natTagMatch(5) = 40 := by { rfl }
theorem pred_lean_style_three_eq_two: predLeanStyle(3) = 2 := by { rfl }
theorem pred_short_succ_three_eq_two: predShortSucc(3) = 2 := by { rfl }
theorem with_let_eq_six: withLet = 6 := by { rfl }
theorem with_inferred_let_eq_four: withInferredLet = 4 := by { rfl }
theorem with_have_eq_four: withHave = 4 := by { rfl }
theorem exact_add2_two_eq_four: add2(2) = 4 := by { exact add2_two_eq_four }
axiom P: Prop;
theorem intro_id_prop: P -> P := by { intro h; exact h }
theorem intro_id_prop_assumption: P -> P := by { intro h; assumption }
theorem direct_assumption(h: P): P := by { assumption }
axiom Q: Prop;
theorem apply_implication(h: P -> Q, hp: P): Q := by { apply h; assumption }
theorem apply_implication_exact(h: P -> Q, hp: P): Q := by { apply h; exact hp }
`);
add(await expectAccepted('reference.psc1.aliases-where-check', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', good, '--json'], parsed => [
  parsed.userDeclarations?.some(d => d.name === 'two' && d.kind === 'definition') ? ok('const.alias.expands', 'const alias appears as definition') : reject('const.alias.expands', 'const alias did not elaborate as a definition'),
  parsed.userDeclarations?.some(d => d.name === 'add2' && d.kind === 'definition') ? ok('function.alias.expands', 'function alias appears as definition') : reject('function.alias.expands', 'function alias did not elaborate as a definition'),
  parsed.userDeclarations?.some(d => d.name === 'choose' && d.kind === 'definition') ? ok('bif.definition.accepted', 'Boolean bif definition elaborates to checked Core') : reject('bif.definition.accepted', 'bif definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'chooseIf' && d.kind === 'definition') ? ok('bool-if.definition.accepted', 'Boolean if expression elaborates to checked Bool.rec sugar') : reject('bool-if.definition.accepted', 'Boolean if definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'chooseMatch' && d.kind === 'definition') ? ok('match.definition.accepted', 'Boolean match definition elaborates through checked Bool recursor') : reject('match.definition.accepted', 'match definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'isZeroMatch' && d.kind === 'definition') ? ok('nat.match.definition.accepted', 'Nat literal/catch-all match definition elaborates through checked Nat recursor') : reject('nat.match.definition.accepted', 'Nat match definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'natTagMatch' && d.kind === 'definition') ? ok('nat.multi-literal-match.definition.accepted', 'multi-literal Nat match definition elaborates through nested checked Nat recursors') : reject('nat.multi-literal-match.definition.accepted', 'multi-literal Nat match definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'predLeanStyle' && d.kind === 'definition') ? ok('nat.lean-style-succ-pattern.definition.accepted', 'Lean-style Nat.succ k constructor pattern elaborates through checked Nat recursor') : reject('nat.lean-style-succ-pattern.definition.accepted', 'Lean-style Nat.succ k definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'predShortSucc' && d.kind === 'definition') ? ok('nat.short-succ-pattern.definition.accepted', 'Type-scoped succ k constructor pattern elaborates through checked Nat recursor') : reject('nat.short-succ-pattern.definition.accepted', 'succ k definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'withLet' && d.kind === 'definition') ? ok('defbody.let.accepted', 'local let inside defBodyBlock elaborates to checked Core let') : reject('defbody.let.accepted', 'local let definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'withInferredLet' && d.kind === 'definition') ? ok('defbody.inferred-let.accepted', 'local let with inferred type elaborates to checked Core let') : reject('defbody.inferred-let.accepted', 'inferred local let definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'withHave' && d.kind === 'definition') ? ok('defbody.have.accepted', 'local have prefix inside defBodyBlock elaborates as nondependent checked let') : reject('defbody.have.accepted', 'local have definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_true_eq_one' && d.kind === 'theorem') ? ok('bif.rfl.true.accepted', 'bif true branch reduces for rfl theorem') : reject('bif.rfl.true.accepted', 'bif true theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_false_eq_two' && d.kind === 'theorem') ? ok('bif.rfl.false.accepted', 'bif false branch reduces for rfl theorem') : reject('bif.rfl.false.accepted', 'bif false theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_if_true_eq_one' && d.kind === 'theorem') ? ok('bool-if.rfl.true.accepted', 'Boolean if true branch reduces for rfl theorem') : reject('bool-if.rfl.true.accepted', 'Boolean if true theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_if_false_eq_two' && d.kind === 'theorem') ? ok('bool-if.rfl.false.accepted', 'Boolean if false branch reduces for rfl theorem') : reject('bool-if.rfl.false.accepted', 'Boolean if false theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_match_true_eq_one' && d.kind === 'theorem') ? ok('match.rfl.true.accepted', 'match true branch reduces for rfl theorem') : reject('match.rfl.true.accepted', 'match true theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'choose_match_false_eq_two' && d.kind === 'theorem') ? ok('match.rfl.false.accepted', 'match false branch reduces for rfl theorem') : reject('match.rfl.false.accepted', 'match false theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'is_zero_match_zero_eq_true' && d.kind === 'theorem') ? ok('nat.match.rfl.zero.accepted', 'Nat match zero branch reduces for rfl theorem') : reject('nat.match.rfl.zero.accepted', 'Nat match zero theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'is_zero_match_one_eq_false' && d.kind === 'theorem') ? ok('nat.match.rfl.succ.accepted', 'Nat match successor branch reduces for rfl theorem') : reject('nat.match.rfl.succ.accepted', 'Nat match successor theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'with_let_eq_six' && d.kind === 'theorem') ? ok('defbody.let.rfl.accepted', 'local let reduces for rfl theorem') : reject('defbody.let.rfl.accepted', 'local let rfl theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'with_have_eq_four' && d.kind === 'theorem') ? ok('defbody.have.rfl.accepted', 'local have reduces for rfl theorem') : reject('defbody.have.rfl.accepted', 'local have rfl theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'Tiny' && d.kind === 'inductive') ? ok('inductive.where.accepted', 'canonical inductive where block accepted') : reject('inductive.where.accepted', 'canonical inductive where block missing'),
  parsed.userDeclarations?.some(d => d.name === 'Color' && d.kind === 'inductive') ? ok('inductive.user-multictor.accepted', 'parameterless multi-constructor user inductive accepted') : reject('inductive.user-multictor.accepted', 'Color inductive missing'),
  parsed.userDeclarations?.some(d => d.name === 'colorCode' && d.kind === 'definition') ? ok('inductive.user-multictor.match.accepted', 'multi-constructor user inductive match elaborates through checked recursor') : reject('inductive.user-multictor.match.accepted', 'colorCode definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'maybeDefault' && d.kind === 'definition') ? ok('inductive.user-payload.match.accepted', 'payload-carrying nonrecursive user inductive match elaborates through checked recursor') : reject('inductive.user-payload.match.accepted', 'maybeDefault definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'red_code_eq_one' && d.kind === 'theorem') ? ok('inductive.user-multictor.rfl.red.accepted', 'multi-constructor user inductive red branch reduces for rfl theorem') : reject('inductive.user-multictor.rfl.red.accepted', 'red code theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'some_default_eq_seven' && d.kind === 'theorem') ? ok('inductive.user-payload.rfl.some.accepted', 'payload-carrying user inductive branch reduces for rfl theorem') : reject('inductive.user-payload.rfl.some.accepted', 'some payload theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'Point' && d.kind === 'inductive') ? ok('structure.where.accepted', 'canonical structure where block elaborates to inductive') : reject('structure.where.accepted', 'canonical structure where block missing'),
  parsed.userDeclarations?.some(d => d.name === 'Point.x' && d.kind === 'definition') ? ok('structure.projection.x.accepted', 'structure field projection Point.x elaborates') : reject('structure.projection.x.accepted', 'Point.x projection missing'),
  parsed.userDeclarations?.some(d => d.name === 'point' && d.kind === 'definition') ? ok('structure.instance.accepted', 'structure instance elaborates to checked constructor application') : reject('structure.instance.accepted', 'structure instance definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'literalPunnedPoint' && d.kind === 'definition') ? ok('structure.literal.punning.accepted', 'structure literal field punning elaborates to same-name checked field values') : reject('structure.literal.punning.accepted', 'structure literal punning definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'literalPunnedX' && d.kind === 'definition') ? ok('structure.literal.punning.projection.x.accepted', 'literal-punned structure x projection elaborates') : reject('structure.literal.punning.projection.x.accepted', 'literal-punned structure x definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'literalPunnedY' && d.kind === 'definition') ? ok('structure.literal.punning.projection.y.accepted', 'literal-punned structure y projection elaborates') : reject('structure.literal.punning.projection.y.accepted', 'literal-punned structure y definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointDotX' && d.kind === 'definition') ? ok('structure.dot-projection.x.accepted', 'dotted structure projection point.x elaborates to generated projection') : reject('structure.dot-projection.x.accepted', 'point.x dot projection definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointDotY' && d.kind === 'definition') ? ok('structure.dot-projection.y.accepted', 'dotted structure projection point.y elaborates to generated projection') : reject('structure.dot-projection.y.accepted', 'point.y dot projection definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointMoved' && d.kind === 'definition') ? ok('structure.update.accepted', 'structure update elaborates to generated constructor plus projections') : reject('structure.update.accepted', 'structure update definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointMovedX' && d.kind === 'definition') ? ok('structure.update.projection.x.accepted', 'updated structure x projection elaborates') : reject('structure.update.projection.x.accepted', 'updated structure x definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointMovedY' && d.kind === 'definition') ? ok('structure.update.projection.y.accepted', 'updated structure y projection elaborates') : reject('structure.update.projection.y.accepted', 'updated structure y definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointPunned' && d.kind === 'definition') ? ok('structure.update.punning.accepted', 'structure update field punning elaborates to same-name checked value') : reject('structure.update.punning.accepted', 'structure update punning definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointPunnedX' && d.kind === 'definition') ? ok('structure.update.punning.projection.x.accepted', 'punned structure update x projection elaborates') : reject('structure.update.punning.projection.x.accepted', 'punned structure update x projection missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointPunnedY' && d.kind === 'definition') ? ok('structure.update.punning.projection.y.accepted', 'punned structure update y projection elaborates') : reject('structure.update.punning.projection.y.accepted', 'punned structure update y projection missing'),
  parsed.userDeclarations?.some(d => d.name === 'matchPointX' && d.kind === 'definition') ? ok('structure.match.x.accepted', 'single-constructor structure match/destructuring elaborates through checked recursor') : reject('structure.match.x.accepted', 'structure match x definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'matchPointY' && d.kind === 'definition') ? ok('structure.match.y.accepted', 'single-constructor structure match/destructuring exposes later field binders') : reject('structure.match.y.accepted', 'structure match y definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'matchedX' && d.kind === 'definition') ? ok('structure.match.call.x.accepted', 'structure match result can flow through checked function call') : reject('structure.match.call.x.accepted', 'matchedX definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'matchedY' && d.kind === 'definition') ? ok('structure.match.call.y.accepted', 'structure match second-field result can flow through checked function call') : reject('structure.match.call.y.accepted', 'matchedY definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_x_eq_one' && d.kind === 'theorem') ? ok('structure.projection.rfl.x.accepted', 'structure projection reduces for rfl theorem') : reject('structure.projection.rfl.x.accepted', 'structure projection x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_y_eq_two' && d.kind === 'theorem') ? ok('structure.projection.rfl.y.accepted', 'structure projection y reduces for rfl theorem') : reject('structure.projection.rfl.y.accepted', 'structure projection y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_dot_x_eq_one' && d.kind === 'theorem') ? ok('structure.dot-projection.rfl.x.accepted', 'dotted structure projection x reduces for rfl theorem') : reject('structure.dot-projection.rfl.x.accepted', 'dot projection x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_dot_y_eq_two' && d.kind === 'theorem') ? ok('structure.dot-projection.rfl.y.accepted', 'dotted structure projection y reduces for rfl theorem') : reject('structure.dot-projection.rfl.y.accepted', 'dot projection y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_moved_x_eq_three' && d.kind === 'theorem') ? ok('structure.update.rfl.x.accepted', 'structure update changed field reduces for rfl theorem') : reject('structure.update.rfl.x.accepted', 'structure update x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_moved_y_eq_two' && d.kind === 'theorem') ? ok('structure.update.rfl.y.accepted', 'structure update preserved field reduces for rfl theorem') : reject('structure.update.rfl.y.accepted', 'structure update y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_punned_x_eq_six' && d.kind === 'theorem') ? ok('structure.update.punning.rfl.x.accepted', 'punned structure update changed field reduces for rfl theorem') : reject('structure.update.punning.rfl.x.accepted', 'punned structure update x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'point_punned_y_eq_two' && d.kind === 'theorem') ? ok('structure.update.punning.rfl.y.accepted', 'punned structure update preserved field reduces for rfl theorem') : reject('structure.update.punning.rfl.y.accepted', 'punned structure update y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'matched_x_eq_one' && d.kind === 'theorem') ? ok('structure.match.rfl.x.accepted', 'structure match first field reduces for rfl theorem') : reject('structure.match.rfl.x.accepted', 'structure match x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'matched_y_eq_two' && d.kind === 'theorem') ? ok('structure.match.rfl.y.accepted', 'structure match second field reduces for rfl theorem') : reject('structure.match.rfl.y.accepted', 'structure match y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'boxMoved' && d.kind === 'definition') ? ok('structure.nested-update.accepted', 'nested structure update field path p.x elaborates through generated checked projections') : reject('structure.nested-update.accepted', 'nested structure update definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'boxMovedBoth' && d.kind === 'definition') ? ok('structure.nested-update.multi.accepted', 'multiple nested structure update field paths sharing a top-level field elaborate') : reject('structure.nested-update.multi.accepted', 'multi nested structure update definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointFromParenBase' && d.kind === 'definition') ? ok('structure.update.parenthesized-base.accepted', 'parenthesized checked structure update base elaborates through constructor/projection lowering') : reject('structure.update.parenthesized-base.accepted', 'parenthesized update base definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'pointFromDottedParenBase' && d.kind === 'definition') ? ok('structure.update.dotted-parenthesized-base.accepted', 'parenthesized dotted projection update base elaborates through checked projections') : reject('structure.update.dotted-parenthesized-base.accepted', 'dotted parenthesized update base definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'box_moved_x_eq_seven' && d.kind === 'theorem') ? ok('structure.nested-update.rfl.x.accepted', 'nested structure update changed field reduces for rfl theorem') : reject('structure.nested-update.rfl.x.accepted', 'nested structure update x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'box_moved_y_eq_two' && d.kind === 'theorem') ? ok('structure.nested-update.rfl.preserved.accepted', 'nested structure update preserves sibling field for rfl theorem') : reject('structure.nested-update.rfl.preserved.accepted', 'nested structure update preserved theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'box_moved_label_eq_nine' && d.kind === 'theorem') ? ok('structure.nested-update.rfl.outer-preserved.accepted', 'nested structure update preserves outer sibling field for rfl theorem') : reject('structure.nested-update.rfl.outer-preserved.accepted', 'nested structure update outer preserved theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'box_moved_both_x_eq_eight' && d.kind === 'theorem') ? ok('structure.nested-update.rfl.multi-x.accepted', 'multi nested structure update x field reduces for rfl theorem') : reject('structure.nested-update.rfl.multi-x.accepted', 'multi nested structure update x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'box_moved_both_y_eq_six' && d.kind === 'theorem') ? ok('structure.nested-update.rfl.multi-y.accepted', 'multi nested structure update y field reduces for rfl theorem') : reject('structure.nested-update.rfl.multi-y.accepted', 'multi nested structure update y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'paren_base_x_eq_four' && d.kind === 'theorem') ? ok('structure.update.parenthesized-base.rfl.x.accepted', 'parenthesized update base changed field reduces for rfl theorem') : reject('structure.update.parenthesized-base.rfl.x.accepted', 'parenthesized update base x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'paren_base_y_eq_two' && d.kind === 'theorem') ? ok('structure.update.parenthesized-base.rfl.y.accepted', 'parenthesized update base preserved field reduces for rfl theorem') : reject('structure.update.parenthesized-base.rfl.y.accepted', 'parenthesized update base y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'dotted_paren_base_x_eq_one' && d.kind === 'theorem') ? ok('structure.update.dotted-parenthesized-base.rfl.x.accepted', 'dotted parenthesized update base preserved field reduces for rfl theorem') : reject('structure.update.dotted-parenthesized-base.rfl.x.accepted', 'dotted parenthesized update base x theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'dotted_paren_base_y_eq_six' && d.kind === 'theorem') ? ok('structure.update.dotted-parenthesized-base.rfl.y.accepted', 'dotted parenthesized update base changed field reduces for rfl theorem') : reject('structure.update.dotted-parenthesized-base.rfl.y.accepted', 'dotted parenthesized update base y theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'intro_id_prop' && d.kind === 'theorem') ? ok('intro.tactic.accepted', 'intro/exact proof elaborates to checked theorem') : reject('intro.tactic.accepted', 'intro/exact theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'intro_id_prop_assumption' && d.kind === 'theorem') ? ok('assumption.tactic.accepted', 'intro/assumption proof elaborates to checked theorem') : reject('assumption.tactic.accepted', 'intro/assumption theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'direct_assumption' && d.kind === 'theorem') ? ok('direct.assumption.accepted', 'direct local-context assumption proof elaborates to checked theorem') : reject('direct.assumption.accepted', 'direct assumption theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'apply_implication' && d.kind === 'theorem') ? ok('apply.tactic.accepted', 'apply/assumption proof elaborates to checked theorem') : reject('apply.tactic.accepted', 'apply/assumption theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'apply_implication_exact' && d.kind === 'theorem') ? ok('apply.exact.accepted', 'apply/exact proof elaborates to checked theorem') : reject('apply.exact.accepted', 'apply/exact theorem missing'),
]));
add(await expectAccepted('reference.psc1.aliases-where-build-js', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', good, '--out', goodJs, '--json'], parsed => [
  parsed.emitted?.some(d => d.name === 'Point.x') ? ok('structure.projection.x.emitted', 'structure projection Point.x emits executable JS') : reject('structure.projection.x.emitted', 'Point.x projection not emitted'),
  parsed.emitted?.some(d => d.name === 'point') ? ok('structure.instance.emitted', 'structure instance emits executable JS frozen-record constructor') : reject('structure.instance.emitted', 'structure instance not emitted'),
  parsed.emitted?.some(d => d.name === 'pointMoved') ? ok('structure.update.emitted', 'structure update emits executable JS through checked constructor/projection lowering') : reject('structure.update.emitted', 'structure update not emitted'),
  parsed.emitted?.some(d => d.name === 'pointPunned') ? ok('structure.update.punning.emitted', 'punned structure update emits executable JS through checked constructor/projection lowering') : reject('structure.update.punning.emitted', 'punned structure update not emitted'),
  parsed.emitted?.some(d => d.name === 'matchPointX') ? ok('structure.match.x.emitted', 'single-constructor structure match emits executable JS through recursor runtime') : reject('structure.match.x.emitted', 'structure match x not emitted'),
  parsed.emitted?.some(d => d.name === 'matchPointY') ? ok('structure.match.y.emitted', 'single-constructor structure match second field emits executable JS through recursor runtime') : reject('structure.match.y.emitted', 'structure match y not emitted'),
  parsed.emitted?.some(d => d.name === 'colorCode') ? ok('inductive.user-multictor.match.emitted', 'multi-constructor user inductive match emits executable JS through checked recursor runtime') : reject('inductive.user-multictor.match.emitted', 'colorCode not emitted'),
  parsed.emitted?.some(d => d.name === 'maybeDefault') ? ok('inductive.user-payload.match.emitted', 'payload user inductive match emits executable JS through checked recursor runtime') : reject('inductive.user-payload.match.emitted', 'maybeDefault not emitted'),
  parsed.emitted?.some(d => d.name === 'boxMoved') ? ok('structure.nested-update.emitted', 'nested structure update emits executable JS through checked constructor/projection lowering') : reject('structure.nested-update.emitted', 'nested structure update not emitted'),
  parsed.emitted?.some(d => d.name === 'pointFromParenBase') ? ok('structure.update.parenthesized-base.emitted', 'parenthesized update base emits executable JS through checked lowering') : reject('structure.update.parenthesized-base.emitted', 'parenthesized update base not emitted'),
  parsed.emitted?.some(d => d.name === 'pointFromDottedParenBase') ? ok('structure.update.dotted-parenthesized-base.emitted', 'dotted parenthesized update base emits executable JS through checked lowering') : reject('structure.update.dotted-parenthesized-base.emitted', 'dotted parenthesized update base not emitted'),
]));
add(await expectAccepted('reference.psc1.function-alias-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'add2', '--args', '5', '--json'], parsed => [
  parsed.result === '7' ? ok('function.alias.executes', 'function alias emits executable JS through definition path') : reject('function.alias.executes', 'function alias execution produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.bif-run-true', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'choose', '--args', 'true', '--json'], parsed => [
  parsed.result === '1' ? ok('bif.executes.true', 'bif true branch executes through JS backend') : reject('bif.executes.true', 'bif true branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.bif-run-false', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'choose', '--args', 'false', '--json'], parsed => [
  parsed.result === '2' ? ok('bif.executes.false', 'bif false branch executes through JS backend') : reject('bif.executes.false', 'bif false branch produced the wrong result', { result: parsed.result }),
]));

add(await expectAccepted('reference.psc1.match-run-true', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'chooseMatch', '--args', 'true', '--json'], parsed => [
  parsed.result === '1' ? ok('match.executes.true', 'match true branch executes through checked recursor and JS backend') : reject('match.executes.true', 'match true branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.match-run-false', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'chooseMatch', '--args', 'false', '--json'], parsed => [
  parsed.result === '2' ? ok('match.executes.false', 'match false branch executes through checked recursor and JS backend') : reject('match.executes.false', 'match false branch produced the wrong result', { result: parsed.result }),
]));

add(await expectAccepted('reference.psc1.nat-match-run-zero', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'isZeroMatch', '--args', '0', '--json'], parsed => [
  parsed.result === 'true' ? ok('nat.match.executes.zero', 'Nat match zero branch executes through checked Nat.rec and JS backend') : reject('nat.match.executes.zero', 'Nat match zero branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.nat-match-run-succ', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'isZeroMatch', '--args', '5', '--json'], parsed => [
  parsed.result === 'false' ? ok('nat.match.executes.succ', 'Nat match successor/catch-all branch executes through checked Nat.rec and JS backend') : reject('nat.match.executes.succ', 'Nat match successor branch produced the wrong result', { result: parsed.result }),
]));


add(await expectAccepted('reference.psc1.nat-multi-literal-match-run-zero', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'natTagMatch', '--args', '0', '--json'], parsed => [
  parsed.result === '10' ? ok('nat.multi-literal-match.executes.zero', 'Nat multi-literal zero branch executes through checked Nat.rec and JS backend') : reject('nat.multi-literal-match.executes.zero', 'Nat multi-literal zero branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.nat-multi-literal-match-run-one', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'natTagMatch', '--args', '1', '--json'], parsed => [
  parsed.result === '20' ? ok('nat.multi-literal-match.executes.one', 'Nat multi-literal one branch executes through checked Nat.rec and JS backend') : reject('nat.multi-literal-match.executes.one', 'Nat multi-literal one branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.nat-multi-literal-match-run-two', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'natTagMatch', '--args', '2', '--json'], parsed => [
  parsed.result === '30' ? ok('nat.multi-literal-match.executes.two', 'Nat multi-literal two branch executes through checked Nat.rec and JS backend') : reject('nat.multi-literal-match.executes.two', 'Nat multi-literal two branch produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.nat-multi-literal-match-run-catchall', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'natTagMatch', '--args', '5', '--json'], parsed => [
  parsed.result === '40' ? ok('nat.multi-literal-match.executes.catchall', 'Nat multi-literal catch-all branch executes through checked Nat.rec and JS backend') : reject('nat.multi-literal-match.executes.catchall', 'Nat multi-literal catch-all branch produced the wrong result', { result: parsed.result }),
]));

add(await expectAccepted('reference.psc1.nat-lean-style-succ-pattern-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'predLeanStyle', '--args', '3', '--json'], parsed => [
  parsed.result === '2' ? ok('nat.lean-style-succ-pattern.executes', 'Nat.succ k pattern executes through checked Nat.rec and JS backend') : reject('nat.lean-style-succ-pattern.executes', 'Nat.succ k pattern produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.nat-short-succ-pattern-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'predShortSucc', '--args', '3', '--json'], parsed => [
  parsed.result === '2' ? ok('nat.short-succ-pattern.executes', 'succ k pattern resolves by scrutinee type and executes through checked Nat.rec and JS backend') : reject('nat.short-succ-pattern.executes', 'succ k pattern produced the wrong result', { result: parsed.result }),
]));

add(await expectAccepted('reference.psc1.structure-point-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointX', '--json'], parsed => [
  parsed.result === '1' ? ok('structure.projection.x.executes', 'structure projection x executes through checked constructor/projection JS backend') : reject('structure.projection.x.executes', 'structure projection x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-point-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.projection.y.executes', 'structure projection y executes through checked constructor/projection JS backend') : reject('structure.projection.y.executes', 'structure projection y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-literal-punning-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'literalPunnedX', '--json'], parsed => [
  parsed.result === '4' ? ok('structure.literal.punning.x.executes', 'literal-punned structure x executes through checked constructor/projection JS backend') : reject('structure.literal.punning.x.executes', 'literal-punned structure x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-literal-punning-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'literalPunnedY', '--json'], parsed => [
  parsed.result === '5' ? ok('structure.literal.punning.y.executes', 'literal-punned structure y executes through checked constructor/projection JS backend') : reject('structure.literal.punning.y.executes', 'literal-punned structure y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-dot-point-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointDotX', '--json'], parsed => [
  parsed.result === '1' ? ok('structure.dot-projection.x.executes', 'dotted structure projection x executes through generated checked projection') : reject('structure.dot-projection.x.executes', 'dotted structure projection x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-dot-point-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointDotY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.dot-projection.y.executes', 'dotted structure projection y executes through generated checked projection') : reject('structure.dot-projection.y.executes', 'dotted structure projection y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-point-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointMovedX', '--json'], parsed => [
  parsed.result === '3' ? ok('structure.update.x.executes', 'structure update changed field executes through checked constructor/projection lowering') : reject('structure.update.x.executes', 'structure update x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-point-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointMovedY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.update.y.executes', 'structure update preserved field executes through checked projection reconstruction') : reject('structure.update.y.executes', 'structure update y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-punning-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointPunnedX', '--json'], parsed => [
  parsed.result === '6' ? ok('structure.update.punning.x.executes', 'punned structure update changed field executes through checked constructor/projection lowering') : reject('structure.update.punning.x.executes', 'punned structure update x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-punning-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'pointPunnedY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.update.punning.y.executes', 'punned structure update preserved field executes through checked projection reconstruction') : reject('structure.update.punning.y.executes', 'punned structure update y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-match-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'matchedX', '--json'], parsed => [
  parsed.result === '1' ? ok('structure.match.x.executes', 'single-constructor structure match first field executes through checked recursor runtime') : reject('structure.match.x.executes', 'structure match x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-match-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'matchedY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.match.y.executes', 'single-constructor structure match second field executes through checked recursor runtime') : reject('structure.match.y.executes', 'structure match y produced the wrong result', { result: parsed.result }),
]));

add(await expectAccepted('reference.psc1.user-inductive-color-code-red-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'redCode', '--json'], parsed => [
  parsed.result === '1' ? ok('inductive.user-multictor.match.red.executes', 'multi-constructor user inductive red branch executes through checked recursor runtime') : reject('inductive.user-multictor.match.red.executes', 'redCode produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.user-inductive-color-code-blue-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'blueCode', '--json'], parsed => [
  parsed.result === '3' ? ok('inductive.user-multictor.match.blue.executes', 'multi-constructor user inductive blue branch executes through checked recursor runtime') : reject('inductive.user-multictor.match.blue.executes', 'blueCode produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.user-inductive-maybe-none-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'noneDefault', '--json'], parsed => [
  parsed.result === '0' ? ok('inductive.user-payload.match.none.executes', 'zero-field user inductive branch executes through checked recursor runtime') : reject('inductive.user-payload.match.none.executes', 'noneDefault produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.user-inductive-maybe-some-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'someDefault', '--json'], parsed => [
  parsed.result === '7' ? ok('inductive.user-payload.match.some.executes', 'payload field is passed to user inductive branch at runtime') : reject('inductive.user-payload.match.some.executes', 'someDefault produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-paren-base-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'parenBaseX', '--json'], parsed => [
  parsed.result === '4' ? ok('structure.update.parenthesized-base.x.executes', 'parenthesized structure update base changed field executes') : reject('structure.update.parenthesized-base.x.executes', 'parenthesized base update x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-paren-base-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'parenBaseY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.update.parenthesized-base.y.executes', 'parenthesized structure update base preserves fields') : reject('structure.update.parenthesized-base.y.executes', 'parenthesized base update y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-dotted-paren-base-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'dottedParenBaseX', '--json'], parsed => [
  parsed.result === '1' ? ok('structure.update.dotted-parenthesized-base.x.executes', 'dotted parenthesized structure update base preserves fields') : reject('structure.update.dotted-parenthesized-base.x.executes', 'dotted parenthesized base update x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-update-dotted-paren-base-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'dottedParenBaseY', '--json'], parsed => [
  parsed.result === '6' ? ok('structure.update.dotted-parenthesized-base.y.executes', 'dotted parenthesized structure update base changed field executes') : reject('structure.update.dotted-parenthesized-base.y.executes', 'dotted parenthesized base update y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-nested-update-x-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'boxMovedX', '--json'], parsed => [
  parsed.result === '7' ? ok('structure.nested-update.x.executes', 'nested structure update changed field executes through checked constructor/projection lowering') : reject('structure.nested-update.x.executes', 'nested update x produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-nested-update-y-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'boxMovedY', '--json'], parsed => [
  parsed.result === '2' ? ok('structure.nested-update.y.executes', 'nested structure update preserves sibling nested field') : reject('structure.nested-update.y.executes', 'nested update y produced the wrong result', { result: parsed.result }),
]));
add(await expectAccepted('reference.psc1.structure-nested-update-label-run', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', good, '--call', 'boxMovedLabel', '--json'], parsed => [
  parsed.result === '9' ? ok('structure.nested-update.label.executes', 'nested structure update preserves outer sibling field') : reject('structure.nested-update.label.executes', 'nested update label produced the wrong result', { result: parsed.result }),
]));

const badStructureFieldType = join(dir, 'BadStructureFieldType.ps');
writeFileSync(badStructureFieldType, `structure BadPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: BadPoint := { {x := true, y := 2} }
`);
add(await expectRejected('reference.reject-structure-field-type-mismatch', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureFieldType, '--json'], /structure field 'x'|expected type|Bool|Nat|type/i));

const badStructureMissingField = join(dir, 'BadStructureMissingField.ps');
writeFileSync(badStructureMissingField, `structure MissingPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: MissingPoint := { {x := 1} }
`);
add(await expectRejected('reference.reject-structure-missing-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureMissingField, '--json'], /missing structure field\(s\)|missing.*y/i));

const badStructureUnknownField = join(dir, 'BadStructureUnknownField.ps');
writeFileSync(badStructureUnknownField, `structure UnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: UnknownPoint := { {x := 1, y := 2, z := 3} }
`);
add(await expectRejected('reference.reject-structure-unknown-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUnknownField, '--json'], /unknown structure field 'z'/i));


const badStructureLiteralPunnedMissingValue = join(dir, 'BadStructureLiteralPunnedMissingValue.ps');
writeFileSync(badStructureLiteralPunnedMissingValue, `structure LiteralPunnedMissingPoint: Type where { x: Nat; y: Nat; }
def bad: LiteralPunnedMissingPoint := { {x, y := 2} }
`);
add(await expectRejected('reference.reject-structure-literal-punning-missing-value', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureLiteralPunnedMissingValue, '--json'], /unknown identifier: x|unknown identifier/i));

const badStructureLiteralPunnedType = join(dir, 'BadStructureLiteralPunnedType.ps');
writeFileSync(badStructureLiteralPunnedType, `structure LiteralPunnedTypePoint: Type where { x: Nat; y: Nat; }
def x: Bool := { true }
def y: Nat := { 2 }
def bad: LiteralPunnedTypePoint := { {x, y} }
`);
add(await expectRejected('reference.reject-structure-literal-punning-type-mismatch', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureLiteralPunnedType, '--json'], /structure field 'x'|expected type|Bool|Nat|type/i));

const badStructureDotUnknownField = join(dir, 'BadStructureDotUnknownField.ps');
writeFileSync(badStructureDotUnknownField, `structure DotPoint: Type where {
  x: Nat;
}
def dot_point: DotPoint := { {x := 1} }
def bad_dot_field: Nat := { dot_point.y }
`);
add(await expectRejected('reference.reject-structure-dot-unknown-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureDotUnknownField, '--json'], /unknown structure field 'y'|unknown identifier: dot_point\.y/i));

const badStructureDotNonStructureBase = join(dir, 'BadStructureDotNonStructureBase.ps');
writeFileSync(badStructureDotNonStructureBase, `def dot_nat_base: Nat := { 1 }
def bad_dot_base: Nat := { dot_nat_base.x }
`);
add(await expectRejected('reference.reject-structure-dot-non-structure-base', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureDotNonStructureBase, '--json'], /unknown identifier: dot_nat_base\.x|structure|projection/i));

const badStructureUpdatePunnedMissingValue = join(dir, 'BadStructureUpdatePunnedMissingValue.ps');
writeFileSync(badStructureUpdatePunnedMissingValue, `structure UpdatePunnedMissingPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_punned_missing_point: UpdatePunnedMissingPoint := { {x := 1, y := 2} }
def bad_update_punned_missing: UpdatePunnedMissingPoint := { {update_punned_missing_point with x} }
`);
add(await expectRejected('reference.reject-structure-update-punned-missing-value', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUpdatePunnedMissingValue, '--json'], /unknown identifier: x|unknown identifier/i));

const badStructureUpdatePunnedUnknownField = join(dir, 'BadStructureUpdatePunnedUnknownField.ps');
writeFileSync(badStructureUpdatePunnedUnknownField, `structure UpdatePunnedUnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_punned_unknown_point: UpdatePunnedUnknownPoint := { {x := 1, y := 2} }
def z: Nat := { 9 }
def bad_update_punned_unknown: UpdatePunnedUnknownPoint := { {update_punned_unknown_point with z} }
`);
add(await expectRejected('reference.reject-structure-update-punned-unknown-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUpdatePunnedUnknownField, '--json'], /unknown structure update field 'z'|unknown structure field 'z'/i));

const badStructureUpdateUnknownField = join(dir, 'BadStructureUpdateUnknownField.ps');
writeFileSync(badStructureUpdateUnknownField, `structure UpdateUnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_unknown_point: UpdateUnknownPoint := { {x := 1, y := 2} }
def bad_update_unknown: UpdateUnknownPoint := { {update_unknown_point with z := 3} }
`);
add(await expectRejected('reference.reject-structure-update-unknown-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUpdateUnknownField, '--json'], /unknown structure update field 'z'|unknown structure field 'z'/i));

const badStructureUpdateDuplicateField = join(dir, 'BadStructureUpdateDuplicateField.ps');
writeFileSync(badStructureUpdateDuplicateField, `structure UpdateDuplicatePoint: Type where {
  x: Nat;
  y: Nat;
}
def update_duplicate_point: UpdateDuplicatePoint := { {x := 1, y := 2} }
def bad_update_duplicate: UpdateDuplicatePoint := { {update_duplicate_point with x := 3, x := 4} }
`);
add(await expectRejected('reference.reject-structure-update-duplicate-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUpdateDuplicateField, '--json'], /duplicate structure update field 'x'/i));

const badStructureUpdateNonStructureBase = join(dir, 'BadStructureUpdateNonStructureBase.ps');
writeFileSync(badStructureUpdateNonStructureBase, `def update_nat_base: Nat := { 1 }
def bad_update_nat_base: Nat := { {update_nat_base with x := 2} }
`);
add(await expectRejected('reference.reject-structure-update-non-structure-base', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badStructureUpdateNonStructureBase, '--json'], /structure update bases|not a source structure|parameterless structure update bases|base type/i));

const badParenthesizedStructureUpdateNoWith = join(dir, 'BadParenthesizedStructureUpdateNoWith.ps');
writeFileSync(badParenthesizedStructureUpdateNoWith, `structure Point: Type where { x: Nat; y: Nat; }
def point: Point := { {x := 1, y := 2} }
def bad: Point := { {(point) x := 3} }
`);
add(await expectRejected('reference.reject-structure-update-parenthesized-base-with-required', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badParenthesizedStructureUpdateNoWith, '--json'], /parenthesized structure update base requires `with`/i));

const badParenthesizedStructureUpdateNonStructureBase = join(dir, 'BadParenthesizedStructureUpdateNonStructureBase.ps');
writeFileSync(badParenthesizedStructureUpdateNonStructureBase, `def n: Nat := { 1 }
def bad: Nat := { {(n) with x := 3} }
`);
add(await expectRejected('reference.reject-structure-update-parenthesized-non-structure-base', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badParenthesizedStructureUpdateNonStructureBase, '--json'], /structure update bases|not a source structure|parameterless structure update bases|base type/i));

const badNestedStructureUpdateUnknownField = join(dir, 'BadNestedStructureUpdateUnknownField.ps');
writeFileSync(badNestedStructureUpdateUnknownField, `structure NestedUpdatePoint: Type where {
  x: Nat;
  y: Nat;
}
structure NestedUpdateBox: Type where {
  p: NestedUpdatePoint;
  label: Nat;
}
def nested_update_point: NestedUpdatePoint := { {x := 1, y := 2} }
def nested_update_box: NestedUpdateBox := { {p := nested_update_point, label := 9} }
def bad_nested_update: NestedUpdateBox := { {nested_update_box with p.z := 3} }
`);
add(await expectRejected('reference.reject-structure-nested-update-unknown-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNestedStructureUpdateUnknownField, '--json'], /unknown structure update field 'z'|unknown structure field 'z'/i));

const badNestedStructureUpdateConflict = join(dir, 'BadNestedStructureUpdateConflict.ps');
writeFileSync(badNestedStructureUpdateConflict, `structure NestedConflictPoint: Type where {
  x: Nat;
  y: Nat;
}
structure NestedConflictBox: Type where {
  p: NestedConflictPoint;
  label: Nat;
}
def nested_conflict_point: NestedConflictPoint := { {x := 1, y := 2} }
def nested_conflict_box: NestedConflictBox := { {p := nested_conflict_point, label := 9} }
def bad_nested_conflict: NestedConflictBox := { {nested_conflict_box with p := nested_conflict_point, p.x := 3} }
`);
add(await expectRejected('reference.reject-structure-nested-update-direct-conflict', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNestedStructureUpdateConflict, '--json'], /cannot mix direct field 'p' with nested field update 'p\.\*'/i));

const badRecursiveUserInductiveRuntime = join(dir, 'BadRecursiveUserInductiveRuntime.ps');
writeFileSync(badRecursiveUserInductiveRuntime, `inductive Chain: Type where {
  | stop
  | next (tail: Chain)
}
def one: Chain := { Chain.next(Chain.stop) }
function bad(c: Chain): Nat := { match (c) { | Chain.stop => 0 | Chain.next tail => 1 } }
def out: Nat := { bad(one) }
`);
add(await expectAccepted('reference.recursive-user-inductive-build-js', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', badRecursiveUserInductiveRuntime, '--out', join(dir, 'recursive-inductive-chain.js'), '--json'], parsed => [
  parsed.emitted?.some(d => d.name === 'bad') ? ok('recursive-inductive.js.case-split.emitted', 'simple self-recursive inductive case split emits after Core checking') : reject('recursive-inductive.js.case-split.emitted', 'bad was not emitted'),
]));
add(await expectAccepted('reference.recursive-user-inductive-run-case-split', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', badRecursiveUserInductiveRuntime, '--call', 'out', '--json'], parsed => parsed.result === '1' ? [ok('recursive-inductive.runtime.case-split.simple', 'simple recursive Chain case split observes next branch')] : [reject('recursive-inductive.runtime.case-split.simple', `expected 1, got ${parsed.result}`)]));

const badLetType = join(dir, 'BadLetType.ps');
writeFileSync(badLetType, `def bad_let_type: Nat := { let x: Bool := 1; 0 }
`);
add(await expectRejected('reference.reject-local-let-type-mismatch', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badLetType, '--json'], /type mismatch|expected Bool|inferred Nat/i));

const badLetFinal = join(dir, 'BadLetFinalSemicolon.ps');
writeFileSync(badLetFinal, `def bad_let_final_semicolon: Nat := { let x: Nat := 1; x; }
`);
add(await expectRejected('reference.reject-defbody-final-semicolon-after-let', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badLetFinal, '--json'], /final term must not have a trailing body-level semicolon/i));

const badComment = join(dir, 'BadComment.ps');
writeFileSync(badComment, `// JavaScript comments are intentionally not ProofScript source comments\nconst x: Nat := { 1 }\n`);
add(await expectRejected('reference.reject-js-line-comment', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badComment, '--json'], /does not use JavaScript \/\/ line comments|standard ProofScript/));

const badArrow = join(dir, 'BadArrowLambda.ps');
writeFileSync(badArrow, `function idNat(x: Nat): Nat := { (y: Nat) => y }\n`);
add(await expectRejected('reference.reject-arrow-only-lambda', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badArrow, '--json'], /rejects arrow-only lambda|use Lean-compatible `fun/));

const badByTerminator = join(dir, 'BadByBlockTerminator.ps');
writeFileSync(badByTerminator, `theorem semicolon_after_by: 2 = 2 := by { rfl };
`);
add(await expectRejected('reference.reject-by-block-command-semicolon', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badByTerminator, '--json'], /self-delimited|must not end with a command-level/));

const badBoolIfBranch = join(dir, 'BadBoolIfBranch.ps');
writeFileSync(badBoolIfBranch, `def bad_if_branch(b: Bool): Nat := { if b then 1 else false }
`);
add(await expectRejected('reference.reject-bool-if-branch-type-mismatch', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badBoolIfBranch, '--json'], /if .*branch|expected result type|Bool|Nat|type/i));

const badBifBranch = join(dir, 'BadBifBranch.ps');
writeFileSync(badBifBranch, `def bad_bif_branch(b: Bool): Nat := { bif (b) { 1 } else { false } }
`);
add(await expectRejected('reference.reject-bif-branch-type-mismatch', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badBifBranch, '--json'], /bif .*branch|expected result type|Bool|type/i));

const badMatchBranchTerminator = join(dir, 'BadMatchBranchTerminator.ps');
writeFileSync(badMatchBranchTerminator, `def bad_match_branch_term(b: Bool): Nat := { match (b) { | true => 1; | false => 2 } }
`);
add(await expectAccepted('reference.accept-match-branch-semicolon', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badMatchBranchTerminator, '--json'], parsed => parsed.userDeclarations?.some(d => d.name === 'bad_match_branch_term') ? [ok('match.branch-semicolon.accepted', 'semicolon-separated match alternatives are accepted under v0.6.1')] : [reject('match.branch-semicolon.accepted', 'expected checked match declaration')]));

const badMatchNonExhaustive = join(dir, 'BadMatchNonExhaustive.ps');
writeFileSync(badMatchNonExhaustive, `def bad_match_nonexhaustive(b: Bool): Nat := { match (b) { | true => 1 } }
`);
add(await expectRejected('reference.reject-match-nonexhaustive', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badMatchNonExhaustive, '--json'], /non-exhaustive|missing/i));

const badNatMatchNonExhaustive = join(dir, 'BadNatMatchNonExhaustive.ps');
writeFileSync(badNatMatchNonExhaustive, `def bad_nat_match_nonexhaustive(n: Nat): Bool := { match (n) { | 0 => true } }
`);
add(await expectRejected('reference.reject-nat-match-nonexhaustive', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNatMatchNonExhaustive, '--json'], /non-exhaustive|missing|Nat\.succ/i));

const badNatMatchBranchTerminator = join(dir, 'BadNatMatchBranchTerminator.ps');
writeFileSync(badNatMatchBranchTerminator, `def bad_nat_match_branch_term(n: Nat): Bool := { match (n) { | 0 => true; | _ => false } }
`);
add(await expectAccepted('reference.accept-nat-match-branch-semicolon', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNatMatchBranchTerminator, '--json'], parsed => parsed.userDeclarations?.some(d => d.name === 'bad_nat_match_branch_term') ? [ok('nat-match.branch-semicolon.accepted', 'semicolon-separated Nat match alternatives are accepted under v0.6.1')] : [reject('nat-match.branch-semicolon.accepted', 'expected checked Nat match declaration')]));


const badNatLiteralMatchDuplicate = join(dir, 'BadNatLiteralMatchDuplicate.ps');
writeFileSync(badNatLiteralMatchDuplicate, `def bad_nat_literal_match_duplicate(n: Nat): Nat := { match (n) { | 1 => 10 | 1 => 20 | _ => 30 } }
`);
add(await expectRejected('reference.reject-nat-literal-match-duplicate', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNatLiteralMatchDuplicate, '--json'], /duplicate Nat numeric match alternative/i));

const badNatLiteralMatchNoWildcard = join(dir, 'BadNatLiteralMatchNoWildcard.ps');
writeFileSync(badNatLiteralMatchNoWildcard, `def bad_nat_literal_match_no_wildcard(n: Nat): Nat := { match (n) { | 1 => 10 } }
`);
add(await expectRejected('reference.reject-nat-literal-match-no-wildcard', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNatLiteralMatchNoWildcard, '--json'], /non-exhaustive|catch-all/i));


const badNatLiteralMatchTooLarge = join(dir, 'BadNatLiteralMatchTooLarge.ps');
writeFileSync(badNatLiteralMatchTooLarge, `def bad_nat_literal_match_too_large(n: Nat): Nat := { match (n) { | 65 => 10 | _ => 30 } }
`);
add(await expectRejected('reference.reject-nat-literal-match-too-large', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badNatLiteralMatchTooLarge, '--json'], /bounded PSC-1 desugaring limit/i));

const badSuccPatternDuplicateBinder = join(dir, 'BadSuccPatternDuplicateBinder.ps');
writeFileSync(badSuccPatternDuplicateBinder, `def bad_succ_pattern_duplicate_binder(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k k => k } }
`);
add(await expectRejected('reference.reject-succ-pattern-duplicate-binder', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badSuccPatternDuplicateBinder, '--json'], /duplicate pattern binder/i));

const badSuccPatternArity = join(dir, 'BadSuccPatternArity.ps');
writeFileSync(badSuccPatternArity, `def bad_succ_pattern_arity(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k extra => k } }
`);
add(await expectRejected('reference.reject-succ-pattern-arity', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badSuccPatternArity, '--json'], /Nat\.succ pattern expects 1 binder\(s\), got 2|expects 1 binder/i));

const badExact = join(dir, 'BadExactGoal.ps');
writeFileSync(badExact, `theorem good: 2 = 2 := by { rfl }
theorem bad: 2 = 3 := by { exact good }
`);
add(await expectRejected('reference.reject-exact-wrong-goal', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badExact, '--json'], /exact failed|expected goal type|type/));

const badAssumption = join(dir, 'BadAssumptionGoal.ps');
writeFileSync(badAssumption, `axiom P: Prop;
axiom Q: Prop;
theorem bad_assumption: P -> Q := by { intro h; assumption }
`);
add(await expectRejected('reference.reject-assumption-wrong-goal', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badAssumption, '--json'], /assumption failed|expected goal type|type/));

const badApply = join(dir, 'BadApplyGoal.ps');
writeFileSync(badApply, `axiom P: Prop;
axiom Q: Prop;
theorem bad_apply(h: P -> Q): Q := by { apply h }
`);
add(await expectRejected('reference.reject-apply-unsolved-subgoal', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badApply, '--json'], /apply failed|subgoal|premise|type/));

const badApplyPremise = join(dir, 'BadApplyPremise.ps');
writeFileSync(badApplyPremise, `axiom P: Prop;
axiom Q: Prop;
theorem bad_apply_premise(h: P -> Q): Q := by { apply h; assumption }
`);
add(await expectRejected('reference.reject-apply-wrong-premise', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badApplyPremise, '--json'], /assumption failed|apply failed|expected goal type|type/));

const badIntro = join(dir, 'BadIntroGoal.ps');
writeFileSync(badIntro, `axiom P: Prop;
axiom Q: Prop;
theorem bad_intro: P -> Q := by { intro h; exact h }
`);
add(await expectRejected('reference.reject-intro-wrong-goal', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badIntro, '--json'], /exact failed|expected goal type|type|intro failed/));


const shorthandSource = join(dir, 'ConstructorShorthandGovernance.ps');
const shorthandJs = join(dir, 'constructor-shorthand-governance.js');
writeFileSync(shorthandSource, `inductive Color: Type where { | red | green | blue }
inductive MaybeNat: Type where { | none | some (value: Nat) }
def redShort: Color := { red }
def greenShort: Color := { green }
def someShort: MaybeNat := { some(7) }
def mkSomeShort: Nat -> MaybeNat := { some }
def fromMkSomeShort: MaybeNat := { mkSomeShort(13) }
function colorCode(c: Color): Nat := { match (c) { | red => 1 | green => 2 | blue => 3 } }
function maybeDefault(m: MaybeNat): Nat := { match (m) { | none => 0 | some value => value } }
def redShortCode: Nat := { colorCode(redShort) }
def greenShortCode: Nat := { colorCode(greenShort) }
def someShortDefault: Nat := { maybeDefault(someShort) }
def fromMkSomeShortDefault: Nat := { maybeDefault(fromMkSomeShort) }
theorem red_short_code_eq_one: redShortCode = 1 := by { rfl }
theorem green_short_code_eq_two: greenShortCode = 2 := by { rfl }
theorem some_short_default_eq_seven: someShortDefault = 7 := by { rfl }
theorem from_mk_some_short_default_eq_thirteen: fromMkSomeShortDefault = 13 := by { rfl }
`);
add(await expectAccepted('reference.constructor-shorthand.check', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', shorthandSource, '--json'], parsed => [
  parsed.userDeclarations?.some(d => d.name === 'redShort' && d.kind === 'definition') ? ok('constructor-shorthand.zero-arity.accepted', 'expected-type-directed red shorthand elaborates to Color.red') : reject('constructor-shorthand.zero-arity.accepted', 'redShort definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'someShort' && d.kind === 'definition') ? ok('constructor-shorthand.payload.accepted', 'expected-type-directed some(7) shorthand elaborates to MaybeNat.some') : reject('constructor-shorthand.payload.accepted', 'someShort definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'mkSomeShort' && d.kind === 'definition') ? ok('constructor-partial-shorthand.function.accepted', 'expected-function-type some shorthand elaborates to constructor function') : reject('constructor-partial-shorthand.function.accepted', 'mkSomeShort definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'red_short_code_eq_one' && d.kind === 'theorem') ? ok('constructor-shorthand.rfl.red.accepted', 'constructor shorthand red result reduces for rfl theorem') : reject('constructor-shorthand.rfl.red.accepted', 'red shorthand theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'some_short_default_eq_seven' && d.kind === 'theorem') ? ok('constructor-shorthand.rfl.some.accepted', 'constructor shorthand payload result reduces for rfl theorem') : reject('constructor-shorthand.rfl.some.accepted', 'some shorthand theorem missing'),
  parsed.userDeclarations?.some(d => d.name === 'from_mk_some_short_default_eq_thirteen' && d.kind === 'theorem') ? ok('constructor-partial-shorthand.rfl.some.accepted', 'partial constructor shorthand result reduces for rfl theorem') : reject('constructor-partial-shorthand.rfl.some.accepted', 'partial constructor shorthand theorem missing'),
]));
add(await expectAccepted('reference.constructor-shorthand.build-js', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', shorthandSource, '--out', shorthandJs, '--json'], parsed => [
  parsed.emitted?.some(d => d.name === 'redShort') ? ok('constructor-shorthand.js.red.emitted', 'red shorthand value emits after Core checking') : reject('constructor-shorthand.js.red.emitted', 'redShort was not emitted'),
  parsed.emitted?.some(d => d.name === 'someShortDefault') ? ok('constructor-shorthand.js.payload.emitted', 'payload shorthand result emits after Core checking') : reject('constructor-shorthand.js.payload.emitted', 'someShortDefault was not emitted'),
  parsed.emitted?.some(d => d.name === 'mkSomeShort') ? ok('constructor-partial-shorthand.js.function.emitted', 'partial constructor shorthand function emits after Core checking') : reject('constructor-partial-shorthand.js.function.emitted', 'mkSomeShort was not emitted'),
  parsed.emitted?.some(d => d.name === 'fromMkSomeShortDefault') ? ok('constructor-partial-shorthand.js.result.emitted', 'partial constructor shorthand result emits after Core checking') : reject('constructor-partial-shorthand.js.result.emitted', 'fromMkSomeShortDefault was not emitted'),
]));
add(await expectAccepted('reference.constructor-shorthand.run-red', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', shorthandSource, '--call', 'redShortCode', '--json'], parsed => parsed.result === '1' ? [ok('constructor-shorthand.runtime.red', 'red shorthand runtime value observes branch 1')] : [reject('constructor-shorthand.runtime.red', `expected 1, got ${parsed.result}`)]));
add(await expectAccepted('reference.constructor-shorthand.run-some', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', shorthandSource, '--call', 'someShortDefault', '--json'], parsed => parsed.result === '7' ? [ok('constructor-shorthand.runtime.some', 'some shorthand runtime payload observes 7')] : [reject('constructor-shorthand.runtime.some', `expected 7, got ${parsed.result}`)]));
add(await expectAccepted('reference.constructor-partial-shorthand.run-some', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', shorthandSource, '--call', 'fromMkSomeShortDefault', '--json'], parsed => parsed.result === '13' ? [ok('constructor-partial-shorthand.runtime.some', 'partial constructor shorthand runtime payload observes 13')] : [reject('constructor-partial-shorthand.runtime.some', `expected 13, got ${parsed.result}`)]));

const recursiveInductiveSource = join(dir, 'RecursiveInductiveGovernance.ps');
const recursiveInductiveJs = join(dir, 'recursive-inductive-governance.js');
writeFileSync(recursiveInductiveSource, `inductive NatList: Type where {
  | nil
  | cons (head: Nat) (tail: NatList)
}
def l0: NatList := { nil }
def l1: NatList := { cons(5, l0) }
def l2: NatList := { cons(6, l1) }
function listLength(xs: NatList): Nat := { match (xs) { | nil => 0 | cons h t => Nat.succ(listLength(t)) } }
function listIsEmpty(xs: NatList): Bool := { match (xs) { | nil => true | cons h t => false } }
def len2: Nat := { listLength(l2) }
def l0empty: Bool := { listIsEmpty(l0) }
def l1empty: Bool := { listIsEmpty(l1) }
theorem len2_eq_two: len2 = 2 := by { rfl }
`);
add(await expectAccepted('reference.recursive-inductive.check', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', recursiveInductiveSource, '--json'], parsed => [
  parsed.userDeclarations?.some(d => d.name === 'NatList' && d.kind === 'inductive') ? ok('recursive-inductive.source.accepted', 'self-recursive NatList source is accepted by the checked frontend') : reject('recursive-inductive.source.accepted', 'NatList declaration missing'),
  parsed.userDeclarations?.some(d => d.name === 'listLength' && d.kind === 'definition') ? ok('recursive-inductive.length.accepted', 'primitive recursive length definition checks') : reject('recursive-inductive.length.accepted', 'listLength definition missing'),
  parsed.userDeclarations?.some(d => d.name === 'len2_eq_two' && d.kind === 'theorem') ? ok('recursive-inductive.rfl.accepted', 'recursive inductive runtime target also reduces for rfl theorem') : reject('recursive-inductive.rfl.accepted', 'len2 theorem missing'),
]));
add(await expectAccepted('reference.recursive-inductive.build-js', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'build-js', recursiveInductiveSource, '--out', recursiveInductiveJs, '--json'], parsed => [
  parsed.emitted?.some(d => d.name === 'listLength') ? ok('recursive-inductive.js.length.emitted', 'recursive-inductive recursor emits after Core checking') : reject('recursive-inductive.js.length.emitted', 'listLength was not emitted'),
  parsed.emitted?.some(d => d.name === 'len2') ? ok('recursive-inductive.js.result.emitted', 'recursive-inductive result emits after Core checking') : reject('recursive-inductive.js.result.emitted', 'len2 was not emitted'),
]));
add(await expectAccepted('reference.recursive-inductive.run-length', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', recursiveInductiveSource, '--call', 'len2', '--json'], parsed => parsed.result === '2' ? [ok('recursive-inductive.runtime.length', 'runtime-computed IHs give NatList length 2')] : [reject('recursive-inductive.runtime.length', `expected 2, got ${parsed.result}`)]));
add(await expectAccepted('reference.recursive-inductive.run-is-empty', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'run', recursiveInductiveSource, '--call', 'l1empty', '--json'], parsed => parsed.result === 'false' ? [ok('recursive-inductive.runtime.case-split', 'recursive inductive case split observes non-empty list')] : [reject('recursive-inductive.runtime.case-split', `expected false, got ${parsed.result}`)]));

const badRecursiveFunctionField = join(dir, 'BadRecursiveFunctionField.ps');
writeFileSync(badRecursiveFunctionField, `inductive BadWrap: Type where {
  | leaf
  | later (f: Nat -> BadWrap)
}
function tag(w: BadWrap): Nat := { match (w) { | leaf => 0 | later f => 1 } }
`);
add(await expectRejected('reference.reject-recursive-inductive-function-field', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badRecursiveFunctionField, '--json'], /has no implemented type|recursive occurrence|BadWrap\.rec/i));

const badConstructorShorthandNoExpected = join(dir, 'BadConstructorShorthandNoExpected.ps');
writeFileSync(badConstructorShorthandNoExpected, `inductive Color: Type where { | red | green }
def bad := { red }
`);
add(await expectRejected('reference.reject-constructor-shorthand-no-expected-type', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badConstructorShorthandNoExpected, '--json'], /unknown identifier: red|unknown identifier|explicit result type/i));

const badConstructorShorthandGlobalWins = join(dir, 'BadConstructorShorthandGlobalWins.ps');
writeFileSync(badConstructorShorthandGlobalWins, `inductive Color: Type where { | red | green }
def red: Nat := { 1 }
def bad: Color := { red }
`);
add(await expectRejected('reference.reject-constructor-shorthand-global-wins', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badConstructorShorthandGlobalWins, '--json'], /expected type|wrong type|Nat|Color|not definitionally equal|application argument/i));

const badConstructorPartialShorthandWrongCodomain = join(dir, 'BadConstructorPartialShorthandWrongCodomain.ps');
writeFileSync(badConstructorPartialShorthandWrongCodomain, `inductive MaybeNat: Type where { | none | some (value: Nat) }
def bad: Nat -> Nat := { some }
`);
add(await expectRejected('reference.reject-constructor-partial-shorthand-wrong-codomain', ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', 'tools/pslive.ts', 'check', badConstructorPartialShorthandWrongCodomain, '--json'], /unknown identifier|result does not match expected type|Nat|MaybeNat|constructor shorthand/i));

const failures = checks.filter(c => c.status === 'rejected');
const result = {
  status: failures.length ? 'rejected' : 'accepted',
  policy: 'ProofScript v0.6.1 reference-governed PSC-1 language smoke',
  trustLabel: 'trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet',
  pinnedLeanRevision: PINNED,
  checkCount: checks.length,
  requiredFailureCount: failures.length,
  checks,
};
const stableResult = stableDetails(result);
const withHash = { ...stableResult, referenceGovernanceSha256: sha256Text(JSON.stringify(stableResult)) };
if (writeDocs) {
  const out = resolve(repoRoot, 'docs/REFERENCE_LANGUAGE_GOVERNANCE_SMOKE.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(withHash, null, 2) + '\n');
}
if (json) console.log(JSON.stringify(withHash, null, 2));
else if (failures.length) console.error(`REFERENCE_LANGUAGE_GOVERNANCE=FAIL failures=${failures.length}`);
else console.log(`REFERENCE_LANGUAGE_GOVERNANCE=PASS checks=${checks.length} sha256=${withHash.referenceGovernanceSha256}`);
process.exit(failures.length ? 1 : 0);
