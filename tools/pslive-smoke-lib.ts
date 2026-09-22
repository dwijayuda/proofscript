import './register-local-workspace.cts';
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { checkProjectFile } = require("../packages/frontend/dist/index.js");
const { loadStandardBootstrap } = require("../packages/environment/dist/index.js");
const { emitJavaScriptModule } = require("../packages/backend-typescript/dist/index.js");
const { PSC1_TRUST_LABEL } = require("../packages/runtime/dist/index.js");

const sha256File = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const standardPreludeDeclarationCount = () => loadStandardBootstrap().artifact.declarations.length;
const checkSmallSource = file => checkProjectFile(file, { prelude: loadStandardBootstrap().artifact });

function emitCheckedJs(checked, sourceFile) {
  return emitJavaScriptModule(checked.artifact, {
    sourceFile,
    sourceText: fs.readFileSync(sourceFile, "utf8"),
    userDeclarationOffset: standardPreludeDeclarationCount(),
  });
}

async function importCommonJsModule(file) {
  const mod = await import(pathToFileURL(file).href);
  return mod.default ?? mod;
}

export async function runSmoke(json = false) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-live-"));
  const source = path.join(dir, "Main.ps");
  const out = path.join(dir, "main.js");
  fs.writeFileSync(source, `-- PSC-1 source uses Lean-compatible comments, not JavaScript // comments.
const two: Nat := { 2 }
function inc(x: Nat): Nat := { Nat.succ(x) }
function add2(x: Nat): Nat := { Nat.add(x, 2) }
function dec(x: Nat): Nat := { x - 1 }
function choose(b: Bool): Nat := { bif (b) { 1 } else { 2 } }
function chooseIf(b: Bool): Nat := { if b then 1 else 2 }
function not(b: Bool): Bool := { bif (b) { false } else { true } }
function chooseMatch(b: Bool): Nat := { match (b) { | true => 1 | false => 2 } }
function isZeroMatch(n: Nat): Bool := { match (n) { | 0 => true | _ => false } }
function natTagMatch(n: Nat): Nat := { match (n) { | 0 => 10 | 1 => 20 | 2 => 30 | _ => 40 } }
function predLeanStyle(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k => k } }
function predShortSucc(n: Nat): Nat := { match (n) { | 0 => 0 | succ k => k } }
def four: Nat := { add2(2) }
def six: Nat := { let x: Nat := add2(2); add2(x) }
def inferredLet: Nat := { let x := 2; add2(x) }
def haveValue: Nat := { have x: Nat := 2; add2(x) }
def fiveMinusTwo: Nat := { 5 - 2 }
def twoMinusFive: Nat := { 2 - 5 }
def natSubMixedPrecedence: Nat := { 8 - 2 * 3 }
def natSubLeftAssoc: Nat := { 10 - 3 - 2 }
def natSubGrouped: Nat := { 10 - (3 - 2) }
def viaNatSub: Nat := { Nat.sub 9 4 }
def viaNatPred: Nat := { Nat.pred 7 }
def chooseTrue: Nat := { choose(true) }
def chooseFalse: Nat := { choose(false) }
def chooseIfTrue: Nat := { chooseIf(true) }
def chooseIfFalse: Nat := { chooseIf(false) }
def chooseMatchTrue: Nat := { chooseMatch(true) }
def chooseMatchFalse: Nat := { chooseMatch(false) }
def isZeroMatchZero: Bool := { isZeroMatch(0) }
def isZeroMatchOne: Bool := { isZeroMatch(1) }
def natTagMatchZero: Nat := { natTagMatch(0) }
def natTagMatchOne: Nat := { natTagMatch(1) }
def natTagMatchTwo: Nat := { natTagMatch(2) }
def natTagMatchLarge: Nat := { natTagMatch(5) }
def predLeanStyleThree: Nat := { predLeanStyle(3) }
def predShortSuccThree: Nat := { predShortSucc(3) }
def notTrue: Bool := { not(true) }
inductive Tiny: Type where {
  | mk
}
inductive Color: Type where {
  | red
  | green
  | blue
}
inductive MaybeNat: Type where {
  | none
  | some (value: Nat)
}
def redColor: Color := { Color.red }
def greenColor: Color := { Color.green }
def blueColor: Color := { Color.blue }
def redShort: Color := { red }
def greenShort: Color := { green }
function colorCode(c: Color): Nat := { match (c) { | Color.red => 1 | Color.green => 2 | Color.blue => 3 } }
def redCode: Nat := { colorCode(redColor) }
def greenCode: Nat := { colorCode(greenColor) }
def blueCode: Nat := { colorCode(blueColor) }
def redShortCode: Nat := { colorCode(redShort) }
def greenShortCode: Nat := { colorCode(greenShort) }
def maybeNone: MaybeNat := { MaybeNat.none }
def maybeSome: MaybeNat := { MaybeNat.some(7) }
def someShort: MaybeNat := { some(11) }
def mkSomeShort: Nat -> MaybeNat := { some }
def fromMkSomeShort: MaybeNat := { mkSomeShort(13) }
function maybeDefault(m: MaybeNat): Nat := { match (m) { | MaybeNat.none => 0 | MaybeNat.some value => value } }
def noneDefault: Nat := { maybeDefault(maybeNone) }
def someDefault: Nat := { maybeDefault(maybeSome) }
def someShortDefault: Nat := { maybeDefault(someShort) }
def fromMkSomeShortDefault: Nat := { maybeDefault(fromMkSomeShort) }
inductive NatList: Type where {
  | nil
  | cons (head: Nat) (tail: NatList)
}
def listZero: NatList := { nil }
def listOne: NatList := { cons(5, listZero) }
def listTwo: NatList := { cons(6, listOne) }
function listLength(xs: NatList): Nat := { match (xs) { | nil => 0 | cons h t => Nat.succ(listLength(t)) } }
function listIsEmpty(xs: NatList): Bool := { match (xs) { | nil => true | cons h t => false } }
def listZeroLength: Nat := { listLength(listZero) }
def listOneLength: Nat := { listLength(listOne) }
def listTwoLength: Nat := { listLength(listTwo) }
def listZeroEmpty: Bool := { listIsEmpty(listZero) }
def listOneEmpty: Bool := { listIsEmpty(listOne) }
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
theorem red_short_code_eq_one: redShortCode = 1 := by { rfl }
theorem green_short_code_eq_two: greenShortCode = 2 := by { rfl }
theorem none_default_eq_zero: noneDefault = 0 := by { rfl }
theorem some_default_eq_seven: someDefault = 7 := by { rfl }
theorem some_short_default_eq_eleven: someShortDefault = 11 := by { rfl }
theorem from_mk_some_short_default_eq_thirteen: fromMkSomeShortDefault = 13 := by { rfl }
theorem list_zero_length_eq_zero: listZeroLength = 0 := by { rfl }
theorem list_one_length_eq_one: listOneLength = 1 := by { rfl }
theorem list_two_length_eq_two: listTwoLength = 2 := by { rfl }
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
theorem five_minus_two_eq_three: fiveMinusTwo = 3 := by { rfl }
theorem two_minus_five_eq_zero: twoMinusFive = 0 := by { rfl }
theorem nat_sub_mixed_precedence_eq_two: natSubMixedPrecedence = 2 := by { rfl }
theorem nat_sub_left_assoc_eq_five: natSubLeftAssoc = 5 := by { rfl }
theorem nat_sub_grouped_eq_nine: natSubGrouped = 9 := by { rfl }
theorem via_nat_sub_eq_five: viaNatSub = 5 := by { rfl }
theorem via_nat_pred_eq_six: viaNatPred = 6 := by { rfl }
theorem two_eq_two: 2 = 2 := by { rfl }
theorem exact_two_eq_two: 2 = 2 := by { exact two_eq_two }
axiom P: Prop;
theorem intro_id_prop: P -> P := by { intro h; exact h }
theorem intro_id_prop_assumption: P -> P := by { intro h; assumption }
theorem direct_assumption(h: P): P := by { assumption }
axiom Q: Prop;
theorem apply_implication(h: P -> Q, hp: P): Q := by { apply h; assumption }
theorem apply_implication_exact(h: P -> Q, hp: P): Q := by { apply h; exact hp }
theorem direct_apply(h: P): P := by { apply h }
example: add2(2) = 4 := by { rfl }
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
`);
  const checked = checkSmallSource(source);
  const emitted = emitCheckedJs(checked, source);
  fs.writeFileSync(out, emitted.js);
  const api = await importCommonJsModule(out);
  const tests = [
    ["two", api.two === 2n],
    ["inc", api.inc(2n) === 3n],
    ["add2", api.add2(3n) === 5n],
    ["dec", api.dec(4n) === 3n && api.dec(0n) === 0n],
    ["four", api.four === 4n],
    ["six", api.six === 6n],
    ["inferredLet", api.inferredLet === 4n],
    ["haveValue", api.haveValue === 4n],
    ["fiveMinusTwo", api.fiveMinusTwo === 3n],
    ["twoMinusFive", api.twoMinusFive === 0n],
    ["natSubMixedPrecedence", api.natSubMixedPrecedence === 2n],
    ["natSubLeftAssoc", api.natSubLeftAssoc === 5n],
    ["natSubGrouped", api.natSubGrouped === 9n],
    ["viaNatSub", api.viaNatSub === 5n],
    ["viaNatPred", api.viaNatPred === 6n],
    ["choose", api.choose(true) === 1n && api.choose(false) === 2n],
    ["chooseIf", api.chooseIf(true) === 1n && api.chooseIf(false) === 2n],
    ["chooseMatch", api.chooseMatch(true) === 1n && api.chooseMatch(false) === 2n],
    ["isZeroMatch", api.isZeroMatch(0n) === true && api.isZeroMatch(1n) === false && api.isZeroMatch(5n) === false],
    ["natTagMatch", api.natTagMatch(0n) === 10n && api.natTagMatch(1n) === 20n && api.natTagMatch(2n) === 30n && api.natTagMatch(5n) === 40n],
    ["predLeanStyle", api.predLeanStyle(0n) === 0n && api.predLeanStyle(3n) === 2n],
    ["predShortSucc", api.predShortSucc(0n) === 0n && api.predShortSucc(3n) === 2n],
    ["chooseTrue", api.chooseTrue === 1n],
    ["chooseFalse", api.chooseFalse === 2n],
    ["chooseIfTrue", api.chooseIfTrue === 1n],
    ["chooseIfFalse", api.chooseIfFalse === 2n],
    ["chooseMatchTrue", api.chooseMatchTrue === 1n],
    ["chooseMatchFalse", api.chooseMatchFalse === 2n],
    ["isZeroMatchZero", api.isZeroMatchZero === true],
    ["isZeroMatchOne", api.isZeroMatchOne === false],
    ["natTagMatchZero", api.natTagMatchZero === 10n],
    ["natTagMatchOne", api.natTagMatchOne === 20n],
    ["natTagMatchTwo", api.natTagMatchTwo === 30n],
    ["natTagMatchLarge", api.natTagMatchLarge === 40n],
    ["predLeanStyleThree", api.predLeanStyleThree === 2n],
    ["predShortSuccThree", api.predShortSuccThree === 2n],
    ["not", api.not(true) === false && api.not(false) === true],
    ["notTrue", api.notTrue === false],
    ["redColor", api.redColor && api.redColor.__psInductive === "Color" && api.redColor.__psCtor === 0],
    ["greenColor", api.greenColor && api.greenColor.__psInductive === "Color" && api.greenColor.__psCtor === 1],
    ["blueColor", api.blueColor && api.blueColor.__psInductive === "Color" && api.blueColor.__psCtor === 2],
    ["redShort", api.redShort && api.redShort.__psInductive === "Color" && api.redShort.__psCtor === 0],
    ["greenShort", api.greenShort && api.greenShort.__psInductive === "Color" && api.greenShort.__psCtor === 1],
    ["colorCode", api.colorCode(api.redColor) === 1n && api.colorCode(api.greenColor) === 2n && api.colorCode(api.blueColor) === 3n],
    ["redCode", api.redCode === 1n],
    ["greenCode", api.greenCode === 2n],
    ["blueCode", api.blueCode === 3n],
    ["redShortCode", api.redShortCode === 1n],
    ["greenShortCode", api.greenShortCode === 2n],
    ["maybeNone", api.maybeNone && api.maybeNone.__psInductive === "MaybeNat" && api.maybeNone.__psCtor === 0],
    ["maybeSome", api.maybeSome && api.maybeSome.__psInductive === "MaybeNat" && api.maybeSome.__psCtor === 1 && api.maybeSome.fields[0] === 7n],
    ["someShort", api.someShort && api.someShort.__psInductive === "MaybeNat" && api.someShort.__psCtor === 1 && api.someShort.fields[0] === 11n],
    ["mkSomeShort", typeof api.mkSomeShort === "function" && api.mkSomeShort(13n).__psInductive === "MaybeNat" && api.mkSomeShort(13n).__psCtor === 1 && api.mkSomeShort(13n).fields[0] === 13n],
    ["maybeDefault", api.maybeDefault(api.maybeNone) === 0n && api.maybeDefault(api.maybeSome) === 7n && api.maybeDefault(api.someShort) === 11n && api.maybeDefault(api.fromMkSomeShort) === 13n],
    ["noneDefault", api.noneDefault === 0n],
    ["someDefault", api.someDefault === 7n],
    ["someShortDefault", api.someShortDefault === 11n],
    ["fromMkSomeShortDefault", api.fromMkSomeShortDefault === 13n],
    ["listLength", api.listLength(api.listZero) === 0n && api.listLength(api.listOne) === 1n && api.listLength(api.listTwo) === 2n],
    ["listIsEmpty", api.listIsEmpty(api.listZero) === true && api.listIsEmpty(api.listOne) === false],
    ["listTwoLength", api.listTwoLength === 2n],
    ["point", api.point && api.point.__psInductive === "Point" && api.point.__psCtor === 0 && api.point.fields[0] === 1n && api.point.fields[1] === 2n],
    ["literalPunnedPoint", api.literalPunnedPoint && api.literalPunnedPoint.__psInductive === "Point" && api.literalPunnedPoint.__psCtor === 0 && api.literalPunnedPoint.fields[0] === 4n && api.literalPunnedPoint.fields[1] === 5n],
    ["literalPunnedX", api.literalPunnedX === 4n],
    ["literalPunnedY", api.literalPunnedY === 5n],
    ["pointX", api.pointX === 1n && api["Point.x"](api.point) === 1n],
    ["pointY", api.pointY === 2n && api["Point.y"](api.point) === 2n],
    ["pointDotX", api.pointDotX === 1n],
    ["pointDotY", api.pointDotY === 2n],
    ["pointMoved", api.pointMoved && api.pointMoved.__psInductive === "Point" && api.pointMoved.__psCtor === 0 && api.pointMoved.fields[0] === 3n && api.pointMoved.fields[1] === 2n],
    ["pointMovedX", api.pointMovedX === 3n],
    ["pointMovedY", api.pointMovedY === 2n],
    ["pointPunned", api.pointPunned && api.pointPunned.__psInductive === "Point" && api.pointPunned.fields[0] === 6n && api.pointPunned.fields[1] === 2n],
    ["pointPunnedX", api.pointPunnedX === 6n],
    ["pointPunnedY", api.pointPunnedY === 2n],
    ["matchPointX", api.matchPointX(api.point) === 1n],
    ["matchPointY", api.matchPointY(api.point) === 2n],
    ["matchedX", api.matchedX === 1n],
    ["matchedY", api.matchedY === 2n],
    ["box", api.box && api.box.__psInductive === "Box" && api.box.__psCtor === 0 && api.box.fields[0].__psInductive === "Point" && api.box.fields[1] === 9n],
    ["boxMovedX", api.boxMovedX === 7n],
    ["boxMovedY", api.boxMovedY === 2n],
    ["boxMovedLabel", api.boxMovedLabel === 9n],
    ["boxMovedBothX", api.boxMovedBothX === 8n],
    ["boxMovedBothY", api.boxMovedBothY === 6n],
    ["pointFromParenBase", api.pointFromParenBase && api.pointFromParenBase.__psInductive === "Point" && api.pointFromParenBase.fields[0] === 4n && api.pointFromParenBase.fields[1] === 2n],
    ["pointFromDottedParenBase", api.pointFromDottedParenBase && api.pointFromDottedParenBase.__psInductive === "Point" && api.pointFromDottedParenBase.fields[0] === 1n && api.pointFromDottedParenBase.fields[1] === 6n],
    ["parenBaseX", api.parenBaseX === 4n],
    ["parenBaseY", api.parenBaseY === 2n],
    ["dottedParenBaseX", api.dottedParenBaseX === 1n],
    ["dottedParenBaseY", api.dottedParenBaseY === 6n],
    ["structureProjectionEmitted", emitted.emitted.some(x => x.name === "Point.x") && emitted.emitted.some(x => x.name === "Point.y") && emitted.emitted.some(x => x.name === "Box.p")],
    ["theoremSkipped", emitted.skipped.some(x => x.name === "two_eq_two" && x.kind === "theorem")],
    ["exactTheoremSkipped", emitted.skipped.some(x => x.name === "exact_two_eq_two" && x.kind === "theorem")],
    ["axiomSkipped", emitted.skipped.some(x => x.name === "P" && x.kind === "axiom")],
    ["introTheoremSkipped", emitted.skipped.some(x => x.name === "intro_id_prop" && x.kind === "theorem")],
    ["assumptionIntroTheoremSkipped", emitted.skipped.some(x => x.name === "intro_id_prop_assumption" && x.kind === "theorem")],
    ["directAssumptionTheoremSkipped", emitted.skipped.some(x => x.name === "direct_assumption" && x.kind === "theorem")],
    ["applyImplicationTheoremSkipped", emitted.skipped.some(x => x.name === "apply_implication" && x.kind === "theorem")],
    ["applyImplicationExactTheoremSkipped", emitted.skipped.some(x => x.name === "apply_implication_exact" && x.kind === "theorem")],
    ["bifRflTrueTheoremSkipped", emitted.skipped.some(x => x.name === "choose_true_eq_one" && x.kind === "theorem")],
    ["bifRflFalseTheoremSkipped", emitted.skipped.some(x => x.name === "choose_false_eq_two" && x.kind === "theorem")],
    ["boolIfRflTrueTheoremSkipped", emitted.skipped.some(x => x.name === "choose_if_true_eq_one" && x.kind === "theorem")],
    ["boolIfRflFalseTheoremSkipped", emitted.skipped.some(x => x.name === "choose_if_false_eq_two" && x.kind === "theorem")],
    ["directApplyTheoremSkipped", emitted.skipped.some(x => x.name === "direct_apply" && x.kind === "theorem")],
    ["exampleSkipped", emitted.skipped.some(x => x.kind === "example")],
  ];
  const failures = tests.filter(([, ok]) => !ok).map(([name]) => name);

  let badStructureFieldTypeRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureFieldType.ps", `structure BadPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: BadPoint := { {x := true, y := 2} }
`)); }
  catch (e) { badStructureFieldTypeRejected = e instanceof Error && /structure field 'x'|expected type|Bool|Nat|type/i.test(e.message); }
  if (!badStructureFieldTypeRejected) failures.push("badStructureFieldTypeRejected");

  let badStructureMissingFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureMissingField.ps", `structure MissingPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: MissingPoint := { {x := 1} }
`)); }
  catch (e) { badStructureMissingFieldRejected = e instanceof Error && /missing structure field\(s\)|missing.*y/i.test(e.message); }
  if (!badStructureMissingFieldRejected) failures.push("badStructureMissingFieldRejected");

  let badStructureUnknownFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUnknownField.ps", `structure UnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_point: UnknownPoint := { {x := 1, y := 2, z := 3} }
`)); }
  catch (e) { badStructureUnknownFieldRejected = e instanceof Error && /unknown structure field 'z'/i.test(e.message); }
  if (!badStructureUnknownFieldRejected) failures.push("badStructureUnknownFieldRejected");

  let badStructureLiteralPunnedMissingValueRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureLiteralPunnedMissingValue.ps", `structure LiteralPunnedMissingPoint: Type where {
  x: Nat;
  y: Nat;
}
def bad_literal_punned_missing: LiteralPunnedMissingPoint := { {x, y := 2} }
`)); }
  catch (e) { badStructureLiteralPunnedMissingValueRejected = e instanceof Error && /unknown identifier: x|unknown identifier/i.test(e.message); }
  if (!badStructureLiteralPunnedMissingValueRejected) failures.push("badStructureLiteralPunnedMissingValueRejected");

  let badStructureLiteralPunnedTypeRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureLiteralPunnedType.ps", `structure LiteralPunnedTypePoint: Type where {
  x: Nat;
  y: Nat;
}
def x: Bool := { true }
def y: Nat := { 2 }
def bad_literal_punned_type: LiteralPunnedTypePoint := { {x, y} }
`)); }
  catch (e) { badStructureLiteralPunnedTypeRejected = e instanceof Error && /structure field 'x'|expected type|Bool|Nat|type/i.test(e.message); }
  if (!badStructureLiteralPunnedTypeRejected) failures.push("badStructureLiteralPunnedTypeRejected");


  let badStructureDotUnknownFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureDotUnknownField.ps", `structure DotPoint: Type where {
  x: Nat;
}
def dot_point: DotPoint := { {x := 1} }
def bad_dot_field: Nat := { dot_point.y }
`)); }
  catch (e) { badStructureDotUnknownFieldRejected = e instanceof Error && /unknown structure field 'y'|unknown identifier: dot_point\.y/i.test(e.message); }
  if (!badStructureDotUnknownFieldRejected) failures.push("badStructureDotUnknownFieldRejected");

  let badStructureDotNonStructureBaseRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureDotNonStructureBase.ps", `def dot_nat_base: Nat := { 1 }
def bad_dot_base: Nat := { dot_nat_base.x }
`)); }
  catch (e) { badStructureDotNonStructureBaseRejected = e instanceof Error && /unknown identifier: dot_nat_base\.x|structure|projection/i.test(e.message); }
  if (!badStructureDotNonStructureBaseRejected) failures.push("badStructureDotNonStructureBaseRejected");

  let badStructureUpdatePunnedMissingValueRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUpdatePunnedMissingValue.ps", `structure UpdatePunnedMissingPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_punned_missing_point: UpdatePunnedMissingPoint := { {x := 1, y := 2} }
def bad_update_punned_missing: UpdatePunnedMissingPoint := { {update_punned_missing_point with x} }
`)); }
  catch (e) { badStructureUpdatePunnedMissingValueRejected = e instanceof Error && /unknown identifier: x|unknown identifier/i.test(e.message); }
  if (!badStructureUpdatePunnedMissingValueRejected) failures.push("badStructureUpdatePunnedMissingValueRejected");

  let badStructureUpdatePunnedUnknownFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUpdatePunnedUnknownField.ps", `structure UpdatePunnedUnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_punned_unknown_point: UpdatePunnedUnknownPoint := { {x := 1, y := 2} }
def z: Nat := { 9 }
def bad_update_punned_unknown: UpdatePunnedUnknownPoint := { {update_punned_unknown_point with z} }
`)); }
  catch (e) { badStructureUpdatePunnedUnknownFieldRejected = e instanceof Error && /unknown structure update field 'z'|unknown structure field 'z'/i.test(e.message); }
  if (!badStructureUpdatePunnedUnknownFieldRejected) failures.push("badStructureUpdatePunnedUnknownFieldRejected");

  let badStructureUpdateUnknownFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUpdateUnknownField.ps", `structure UpdateUnknownPoint: Type where {
  x: Nat;
  y: Nat;
}
def update_unknown_point: UpdateUnknownPoint := { {x := 1, y := 2} }
def bad_update_unknown: UpdateUnknownPoint := { {update_unknown_point with z := 3} }
`)); }
  catch (e) { badStructureUpdateUnknownFieldRejected = e instanceof Error && /unknown structure update field 'z'|unknown structure field 'z'/i.test(e.message); }
  if (!badStructureUpdateUnknownFieldRejected) failures.push("badStructureUpdateUnknownFieldRejected");

  let badStructureUpdateDuplicateFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUpdateDuplicateField.ps", `structure UpdateDuplicatePoint: Type where {
  x: Nat;
  y: Nat;
}
def update_duplicate_point: UpdateDuplicatePoint := { {x := 1, y := 2} }
def bad_update_duplicate: UpdateDuplicatePoint := { {update_duplicate_point with x := 3, x := 4} }
`)); }
  catch (e) { badStructureUpdateDuplicateFieldRejected = e instanceof Error && /duplicate structure update field 'x'/i.test(e.message); }
  if (!badStructureUpdateDuplicateFieldRejected) failures.push("badStructureUpdateDuplicateFieldRejected");

  let badStructureUpdateNonStructureBaseRejected = false;
  try { checkSmallSource(writeSource(dir, "BadStructureUpdateNonStructureBase.ps", `def update_nat_base: Nat := { 1 }
def bad_update_nat_base: Nat := { {update_nat_base with x := 2} }
`)); }
  catch (e) { badStructureUpdateNonStructureBaseRejected = e instanceof Error && /structure update bases|not a source structure|parameterless structure update bases|base type/i.test(e.message); }
  if (!badStructureUpdateNonStructureBaseRejected) failures.push("badStructureUpdateNonStructureBaseRejected");

  let badNestedStructureUpdateUnknownFieldRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNestedStructureUpdateUnknownField.ps", `structure NestedUpdatePoint: Type where {
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
`)); }
  catch (e) { badNestedStructureUpdateUnknownFieldRejected = e instanceof Error && /unknown structure update field 'z'|unknown structure field 'z'/i.test(e.message); }
  if (!badNestedStructureUpdateUnknownFieldRejected) failures.push("badNestedStructureUpdateUnknownFieldRejected");

  let badNestedStructureUpdateConflictRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNestedStructureUpdateConflict.ps", `structure NestedConflictPoint: Type where {
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
`)); }
  catch (e) { badNestedStructureUpdateConflictRejected = e instanceof Error && /cannot mix direct field 'p' with nested field update 'p\.\*'/i.test(e.message); }
  if (!badNestedStructureUpdateConflictRejected) failures.push("badNestedStructureUpdateConflictRejected");


  let badConstructorShorthandNoExpectedRejected = false;
  try { checkSmallSource(writeSource(dir, "BadConstructorShorthandNoExpected.ps", `inductive BadCtorColor: Type where {
  | red
  | green
}
def bad := { red }
`)); }
  catch (e) { badConstructorShorthandNoExpectedRejected = e instanceof Error && /unknown identifier: red|unknown identifier|explicit result type/i.test(e.message); }
  if (!badConstructorShorthandNoExpectedRejected) failures.push("badConstructorShorthandNoExpectedRejected");

  let badConstructorShorthandGlobalWinsRejected = false;
  try { checkSmallSource(writeSource(dir, "BadConstructorShorthandGlobalWins.ps", `inductive BadCtorShadowColor: Type where {
  | red
  | green
}
def red: Nat := { 1 }
def bad: BadCtorShadowColor := { red }
`)); }
  catch (e) { badConstructorShorthandGlobalWinsRejected = e instanceof Error && /expected type|application argument|wrong type|Nat|BadCtorShadowColor|not definitionally equal/i.test(e.message); }
  if (!badConstructorShorthandGlobalWinsRejected) failures.push("badConstructorShorthandGlobalWinsRejected");

  let badLetTypeRejected = false;
  try { checkSmallSource(writeSource(dir, "BadLetType.ps", `def bad_let_type: Nat := { let x: Bool := 1; 0 }
`)); }
  catch (e) { badLetTypeRejected = e instanceof Error && /type mismatch|expected Bool|inferred Nat/i.test(e.message); }
  if (!badLetTypeRejected) failures.push("badLetTypeRejected");

  let badLetFinalSemicolonRejected = false;
  try { checkSmallSource(writeSource(dir, "BadLetFinalSemicolon.ps", `def bad_let_final_semicolon: Nat := { let x: Nat := 1; x; }
`)); }
  catch (e) { badLetFinalSemicolonRejected = e instanceof Error && /final term must not have a trailing body-level semicolon/i.test(e.message); }
  if (!badLetFinalSemicolonRejected) failures.push("badLetFinalSemicolonRejected");

  let badBifBranchRejected = false;
  try { checkSmallSource(writeSource(dir, "BadBifBranch.ps", `def bad_bif_branch(b: Bool): Nat := { bif (b) { 1 } else { false } }
`)); }
  catch (e) { badBifBranchRejected = e instanceof Error && /bif .*branch|expected result type|Bool|type/i.test(e.message); }
  if (!badBifBranchRejected) failures.push("badBifBranchRejected");

  let matchBranchSemicolonAccepted = false;
  try { checkSmallSource(writeSource(dir, "MatchBranchSemicolon.ps", `def match_branch_semicolon(b: Bool): Nat := { match (b) { | true => 1; | false => 2 } }
`)); matchBranchSemicolonAccepted = true; }
  catch { matchBranchSemicolonAccepted = false; }
  if (!matchBranchSemicolonAccepted) failures.push("matchBranchSemicolonAccepted");

  let badMatchNonExhaustiveRejected = false;
  try { checkSmallSource(writeSource(dir, "BadMatchNonExhaustive.ps", `def bad_match_nonexhaustive(b: Bool): Nat := { match (b) { | true => 1 } }
`)); }
  catch (e) { badMatchNonExhaustiveRejected = e instanceof Error && /non-exhaustive|missing/i.test(e.message); }
  if (!badMatchNonExhaustiveRejected) failures.push("badMatchNonExhaustiveRejected");

  let badNatMatchNonExhaustiveRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNatMatchNonExhaustive.ps", `def bad_nat_match_nonexhaustive(n: Nat): Bool := { match (n) { | 0 => true } }
`)); }
  catch (e) { badNatMatchNonExhaustiveRejected = e instanceof Error && /non-exhaustive|missing|Nat\.succ/i.test(e.message); }
  if (!badNatMatchNonExhaustiveRejected) failures.push("badNatMatchNonExhaustiveRejected");

  let natMatchBranchSemicolonAccepted = false;
  try { checkSmallSource(writeSource(dir, "NatMatchBranchSemicolon.ps", `def nat_match_branch_semicolon(n: Nat): Bool := { match (n) { | 0 => true; | _ => false } }
`)); natMatchBranchSemicolonAccepted = true; }
  catch { natMatchBranchSemicolonAccepted = false; }
  if (!natMatchBranchSemicolonAccepted) failures.push("natMatchBranchSemicolonAccepted");


  let badNatLiteralMatchDuplicateRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNatLiteralMatchDuplicate.ps", `def bad_nat_literal_match_duplicate(n: Nat): Nat := { match (n) { | 1 => 10 | 1 => 20 | _ => 30 } }
`)); }
  catch (e) { badNatLiteralMatchDuplicateRejected = e instanceof Error && /duplicate Nat numeric match alternative/i.test(e.message); }
  if (!badNatLiteralMatchDuplicateRejected) failures.push("badNatLiteralMatchDuplicateRejected");

  let badNatLiteralMatchNoWildcardRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNatLiteralMatchNoWildcard.ps", `def bad_nat_literal_match_no_wildcard(n: Nat): Nat := { match (n) { | 1 => 10 } }
`)); }
  catch (e) { badNatLiteralMatchNoWildcardRejected = e instanceof Error && /non-exhaustive|catch-all/i.test(e.message); }
  if (!badNatLiteralMatchNoWildcardRejected) failures.push("badNatLiteralMatchNoWildcardRejected");


  let badNatLiteralMatchTooLargeRejected = false;
  try { checkSmallSource(writeSource(dir, "BadNatLiteralMatchTooLarge.ps", `def bad_nat_literal_match_too_large(n: Nat): Nat := { match (n) { | 65 => 10 | _ => 30 } }
`)); }
  catch (e) { badNatLiteralMatchTooLargeRejected = e instanceof Error && /bounded PSC-1 desugaring limit/i.test(e.message); }
  if (!badNatLiteralMatchTooLargeRejected) failures.push("badNatLiteralMatchTooLargeRejected");

  let badSuccPatternDuplicateBinderRejected = false;
  try { checkSmallSource(writeSource(dir, "BadSuccPatternDuplicateBinder.ps", `def bad_succ_pattern_duplicate_binder(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k k => k } }
`)); }
  catch (e) { badSuccPatternDuplicateBinderRejected = e instanceof Error && /duplicate pattern binder/i.test(e.message); }
  if (!badSuccPatternDuplicateBinderRejected) failures.push("badSuccPatternDuplicateBinderRejected");

  let badSuccPatternArityRejected = false;
  try { checkSmallSource(writeSource(dir, "BadSuccPatternArity.ps", `def bad_succ_pattern_arity(n: Nat): Nat := { match (n) { | 0 => 0 | Nat.succ k extra => k } }
`)); }
  catch (e) { badSuccPatternArityRejected = e instanceof Error && /Nat\.succ pattern expects 1 binder\(s\), got 2|expects 1 binder/i.test(e.message); }
  if (!badSuccPatternArityRejected) failures.push("badSuccPatternArityRejected");

  let badBoolIfBranchRejected = false;
  try { checkSmallSource(writeSource(dir, "BadBoolIfBranch.ps", `def bad_if_branch(b: Bool): Nat := { if b then 1 else false }
`)); }
  catch (e) { badBoolIfBranchRejected = e instanceof Error && /if .*branch|expected result type|Bool|Nat|type/i.test(e.message); }
  if (!badBoolIfBranchRejected) failures.push("badBoolIfBranchRejected");

  let badRflRejected = false;
  try { checkSmallSource(writeSource(dir, "BadRfl.ps", `theorem bad_two_eq_three: 2 = 3 := by { rfl }\n`)); }
  catch (e) { badRflRejected = e instanceof Error && /rfl failed|definitionally equal|rejected/.test(e.message); }
  if (!badRflRejected) failures.push("badRflRejected");

  let badExactRejected = false;
  try { checkSmallSource(writeSource(dir, "BadExact.ps", `theorem good: 2 = 2 := by { rfl }\ntheorem bad_exact: 2 = 3 := by { exact good }\n`)); }
  catch (e) { badExactRejected = e instanceof Error && /exact failed|expected goal type|type|rejected/.test(e.message); }
  if (!badExactRejected) failures.push("badExactRejected");

  let badByBlockTerminatorRejected = false;
  try { checkSmallSource(writeSource(dir, "BadByBlockTerminator.ps", `theorem semicolon_after_by: 2 = 2 := by { rfl };\n`)); }
  catch (e) { badByBlockTerminatorRejected = e instanceof Error && /self-delimited|command-level/.test(e.message); }
  if (!badByBlockTerminatorRejected) failures.push("badByBlockTerminatorRejected");

  let badIntroRejected = false;
  try { checkSmallSource(writeSource(dir, "BadIntro.ps", `axiom P: Prop;
axiom Q: Prop;
theorem bad_intro: P -> Q := by { intro h; exact h }
`)); }
  catch (e) { badIntroRejected = e instanceof Error && /intro failed|exact failed|expected goal type|type|rejected/.test(e.message); }
  if (!badIntroRejected) failures.push("badIntroRejected");

  let badAssumptionRejected = false;
  try { checkSmallSource(writeSource(dir, "BadAssumption.ps", `axiom P: Prop;
axiom Q: Prop;
theorem bad_assumption: P -> Q := by { intro h; assumption }
`)); }
  catch (e) { badAssumptionRejected = e instanceof Error && /assumption failed|expected goal type|type|rejected/.test(e.message); }
  if (!badAssumptionRejected) failures.push("badAssumptionRejected");


  let badApplyRejected = false;
  try { checkSmallSource(writeSource(dir, "BadApply.ps", `axiom P: Prop;
axiom Q: Prop;
theorem bad_apply(h: P -> Q): Q := by { apply h }
`)); }
  catch (e) { badApplyRejected = e instanceof Error && /apply failed|subgoal|premise|type|rejected/.test(e.message); }
  if (!badApplyRejected) failures.push("badApplyRejected");

  let badApplyWrongPremiseRejected = false;
  try { checkSmallSource(writeSource(dir, "BadApplyWrongPremise.ps", `axiom P: Prop;
axiom Q: Prop;
theorem bad_apply_wrong(h: P -> Q): Q := by { apply h; assumption }
`)); }
  catch (e) { badApplyWrongPremiseRejected = e instanceof Error && /assumption failed|apply failed|expected goal type|type|rejected/.test(e.message); }
  if (!badApplyWrongPremiseRejected) failures.push("badApplyWrongPremiseRejected");

  const result = {
    status: failures.length ? "rejected" : "accepted",
    trustLabel: PSC1_TRUST_LABEL,
    checkedDeclarations: checked.summary.declarations.length,
    emittedDeclarations: emitted.emitted.map(x => x.name),
    skippedDeclarations: emitted.skipped,
    theoremSmoke: {
      acceptedNatSubRflTheorem: emitted.skipped.some(x => x.name === "five_minus_two_eq_three" && x.kind === "theorem"),
      acceptedNatSubSaturatingRflTheorem: emitted.skipped.some(x => x.name === "two_minus_five_eq_zero" && x.kind === "theorem"),
      acceptedNatSubPrecedenceRflTheorem: emitted.skipped.some(x => x.name === "nat_sub_mixed_precedence_eq_two" && x.kind === "theorem"),
      acceptedNatPredRflTheorem: emitted.skipped.some(x => x.name === "via_nat_pred_eq_six" && x.kind === "theorem"),
      acceptedRflTheorem: emitted.skipped.some(x => x.name === "two_eq_two" && x.kind === "theorem"),
      acceptedExactTheorem: emitted.skipped.some(x => x.name === "exact_two_eq_two" && x.kind === "theorem"),
      acceptedIntroTheorem: emitted.skipped.some(x => x.name === "intro_id_prop" && x.kind === "theorem"),
      acceptedAssumptionIntroTheorem: emitted.skipped.some(x => x.name === "intro_id_prop_assumption" && x.kind === "theorem"),
      acceptedDirectAssumptionTheorem: emitted.skipped.some(x => x.name === "direct_assumption" && x.kind === "theorem"),
      acceptedApplyImplicationTheorem: emitted.skipped.some(x => x.name === "apply_implication" && x.kind === "theorem"),
      acceptedApplyImplicationExactTheorem: emitted.skipped.some(x => x.name === "apply_implication_exact" && x.kind === "theorem"),
      acceptedDirectApplyTheorem: emitted.skipped.some(x => x.name === "direct_apply" && x.kind === "theorem"),
      acceptedBifRflTrueTheorem: emitted.skipped.some(x => x.name === "choose_true_eq_one" && x.kind === "theorem"),
      acceptedBifRflFalseTheorem: emitted.skipped.some(x => x.name === "choose_false_eq_two" && x.kind === "theorem"),
      acceptedBoolIfRflTrueTheorem: emitted.skipped.some(x => x.name === "choose_if_true_eq_one" && x.kind === "theorem"),
      acceptedBoolIfRflFalseTheorem: emitted.skipped.some(x => x.name === "choose_if_false_eq_two" && x.kind === "theorem"),
      acceptedMatchRflTrueTheorem: emitted.skipped.some(x => x.name === "choose_match_true_eq_one" && x.kind === "theorem"),
      acceptedMatchRflFalseTheorem: emitted.skipped.some(x => x.name === "choose_match_false_eq_two" && x.kind === "theorem"),
      acceptedNatMatchRflZeroTheorem: emitted.skipped.some(x => x.name === "is_zero_match_zero_eq_true" && x.kind === "theorem"),
      acceptedNatMatchRflSuccTheorem: emitted.skipped.some(x => x.name === "is_zero_match_one_eq_false" && x.kind === "theorem"),
      acceptedMultiNatLiteralMatchRflZeroTheorem: emitted.skipped.some(x => x.name === "nat_tag_match_zero_eq_ten" && x.kind === "theorem"),
      acceptedMultiNatLiteralMatchRflOneTheorem: emitted.skipped.some(x => x.name === "nat_tag_match_one_eq_twenty" && x.kind === "theorem"),
      acceptedMultiNatLiteralMatchRflTwoTheorem: emitted.skipped.some(x => x.name === "nat_tag_match_two_eq_thirty" && x.kind === "theorem"),
      acceptedMultiNatLiteralMatchRflCatchAllTheorem: emitted.skipped.some(x => x.name === "nat_tag_match_large_eq_forty" && x.kind === "theorem"),
      acceptedLeanStyleSuccPatternTheorem: emitted.skipped.some(x => x.name === "pred_lean_style_three_eq_two" && x.kind === "theorem"),
      acceptedShortSuccPatternTheorem: emitted.skipped.some(x => x.name === "pred_short_succ_three_eq_two" && x.kind === "theorem"),
      acceptedUserInductiveMatchTheoremRed: emitted.skipped.some(x => x.name === "red_code_eq_one" && x.kind === "theorem"),
      acceptedUserInductiveMatchTheoremGreen: emitted.skipped.some(x => x.name === "green_code_eq_two" && x.kind === "theorem"),
      acceptedUserInductiveMatchTheoremBlue: emitted.skipped.some(x => x.name === "blue_code_eq_three" && x.kind === "theorem"),
      acceptedUserInductivePayloadMatchTheoremNone: emitted.skipped.some(x => x.name === "none_default_eq_zero" && x.kind === "theorem"),
      acceptedUserInductivePayloadMatchTheoremSome: emitted.skipped.some(x => x.name === "some_default_eq_seven" && x.kind === "theorem"),
      acceptedConstructorShorthandTheoremRed: emitted.skipped.some(x => x.name === "red_short_code_eq_one" && x.kind === "theorem"),
      acceptedConstructorShorthandTheoremGreen: emitted.skipped.some(x => x.name === "green_short_code_eq_two" && x.kind === "theorem"),
      acceptedConstructorShorthandPayloadTheoremSome: emitted.skipped.some(x => x.name === "some_short_default_eq_eleven" && x.kind === "theorem"),
      acceptedConstructorPartialShorthandTheoremSome: emitted.skipped.some(x => x.name === "from_mk_some_short_default_eq_thirteen" && x.kind === "theorem"),
      acceptedStructureProjectionTheoremX: emitted.skipped.some(x => x.name === "point_x_eq_one" && x.kind === "theorem"),
      acceptedStructureProjectionTheoremY: emitted.skipped.some(x => x.name === "point_y_eq_two" && x.kind === "theorem"),
      acceptedStructureLiteralPunningTheoremX: emitted.skipped.some(x => x.name === "literal_punned_x_eq_four" && x.kind === "theorem"),
      acceptedStructureLiteralPunningTheoremY: emitted.skipped.some(x => x.name === "literal_punned_y_eq_five" && x.kind === "theorem"),
      acceptedStructureDotProjectionTheoremX: emitted.skipped.some(x => x.name === "point_dot_x_eq_one" && x.kind === "theorem"),
      acceptedStructureDotProjectionTheoremY: emitted.skipped.some(x => x.name === "point_dot_y_eq_two" && x.kind === "theorem"),
      acceptedStructureUpdateTheoremX: emitted.skipped.some(x => x.name === "point_moved_x_eq_three" && x.kind === "theorem"),
      acceptedStructureUpdateTheoremY: emitted.skipped.some(x => x.name === "point_moved_y_eq_two" && x.kind === "theorem"),
      acceptedStructureUpdatePunningTheoremX: emitted.skipped.some(x => x.name === "point_punned_x_eq_six" && x.kind === "theorem"),
      acceptedStructureUpdatePunningTheoremY: emitted.skipped.some(x => x.name === "point_punned_y_eq_two" && x.kind === "theorem"),
      acceptedStructureMatchTheoremX: emitted.skipped.some(x => x.name === "matched_x_eq_one" && x.kind === "theorem"),
      acceptedStructureMatchTheoremY: emitted.skipped.some(x => x.name === "matched_y_eq_two" && x.kind === "theorem"),
      acceptedNestedStructureUpdateTheoremX: emitted.skipped.some(x => x.name === "box_moved_x_eq_seven" && x.kind === "theorem"),
      acceptedNestedStructureUpdateTheoremY: emitted.skipped.some(x => x.name === "box_moved_y_eq_two" && x.kind === "theorem"),
      acceptedNestedStructureUpdateTheoremLabel: emitted.skipped.some(x => x.name === "box_moved_label_eq_nine" && x.kind === "theorem"),
      acceptedNestedStructureUpdateTheoremBothX: emitted.skipped.some(x => x.name === "box_moved_both_x_eq_eight" && x.kind === "theorem"),
      acceptedNestedStructureUpdateTheoremBothY: emitted.skipped.some(x => x.name === "box_moved_both_y_eq_six" && x.kind === "theorem"),
      acceptedParenthesizedUpdateBaseTheoremX: emitted.skipped.some(x => x.name === "paren_base_x_eq_four" && x.kind === "theorem"),
      acceptedParenthesizedUpdateBaseTheoremY: emitted.skipped.some(x => x.name === "paren_base_y_eq_two" && x.kind === "theorem"),
      acceptedDottedParenthesizedUpdateBaseTheoremX: emitted.skipped.some(x => x.name === "dotted_paren_base_x_eq_one" && x.kind === "theorem"),
      acceptedDottedParenthesizedUpdateBaseTheoremY: emitted.skipped.some(x => x.name === "dotted_paren_base_y_eq_six" && x.kind === "theorem"),
      acceptedStructureRuntimeValue: api.pointX === 1n && api.pointY === 2n && api.literalPunnedX === 4n && api.literalPunnedY === 5n && api.pointDotX === 1n && api.pointDotY === 2n && api.pointMovedX === 3n && api.pointMovedY === 2n && api.pointPunnedX === 6n && api.pointPunnedY === 2n && api.matchedX === 1n && api.matchedY === 2n && api.boxMovedX === 7n && api.boxMovedY === 2n && api.boxMovedLabel === 9n && api.boxMovedBothX === 8n && api.boxMovedBothY === 6n && api.parenBaseX === 4n && api.parenBaseY === 2n && api.dottedParenBaseX === 1n && api.dottedParenBaseY === 6n,
      acceptedUserInductiveMatchRuntimeValue: api.redCode === 1n && api.greenCode === 2n && api.blueCode === 3n && api.noneDefault === 0n && api.someDefault === 7n,
      acceptedConstructorShorthandRuntimeValue: api.redShortCode === 1n && api.greenShortCode === 2n && api.someShortDefault === 11n && api.fromMkSomeShortDefault === 13n,
      acceptedRecursiveInductiveRuntimeValue: api.listTwoLength === 2n && api.listOneEmpty === false,
      acceptedRflExample: emitted.skipped.some(x => x.kind === "example"),
      acceptedTypedLet: api.six === 6n,
      acceptedInferredLet: api.inferredLet === 4n,
      acceptedHaveValue: api.haveValue === 4n,
      acceptedBoolIfRuntimeValue: api.chooseIfTrue === 1n && api.chooseIfFalse === 2n,
      rejectedBadConstructorShorthandNoExpected: badConstructorShorthandNoExpectedRejected,
      rejectedBadConstructorShorthandGlobalWins: badConstructorShorthandGlobalWinsRejected,
      rejectedBadLetType: badLetTypeRejected,
      rejectedBadLetFinalSemicolon: badLetFinalSemicolonRejected,
      rejectedBadBifBranch: badBifBranchRejected,
      acceptedMatchBranchSemicolon: matchBranchSemicolonAccepted,
      rejectedBadMatchNonExhaustive: badMatchNonExhaustiveRejected,
      rejectedBadNatMatchNonExhaustive: badNatMatchNonExhaustiveRejected,
      acceptedNatMatchBranchSemicolon: natMatchBranchSemicolonAccepted,
      rejectedBadNatLiteralMatchDuplicate: badNatLiteralMatchDuplicateRejected,
      rejectedBadNatLiteralMatchNoWildcard: badNatLiteralMatchNoWildcardRejected,
      rejectedBadNatLiteralMatchTooLarge: badNatLiteralMatchTooLargeRejected,
      rejectedBadSuccPatternDuplicateBinder: badSuccPatternDuplicateBinderRejected,
      rejectedBadSuccPatternArity: badSuccPatternArityRejected,
      rejectedBadStructureFieldType: badStructureFieldTypeRejected,
      rejectedBadStructureMissingField: badStructureMissingFieldRejected,
      rejectedBadStructureUnknownField: badStructureUnknownFieldRejected,
      rejectedBadStructureLiteralPunnedMissingValue: badStructureLiteralPunnedMissingValueRejected,
      rejectedBadStructureLiteralPunnedType: badStructureLiteralPunnedTypeRejected,
      rejectedBadStructureDotUnknownField: badStructureDotUnknownFieldRejected,
      rejectedBadStructureDotNonStructureBase: badStructureDotNonStructureBaseRejected,
      rejectedBadStructureUpdatePunnedMissingValue: badStructureUpdatePunnedMissingValueRejected,
      rejectedBadStructureUpdatePunnedUnknownField: badStructureUpdatePunnedUnknownFieldRejected,
      rejectedBadStructureUpdateUnknownField: badStructureUpdateUnknownFieldRejected,
      rejectedBadStructureUpdateDuplicateField: badStructureUpdateDuplicateFieldRejected,
      rejectedBadStructureUpdateNonStructureBase: badStructureUpdateNonStructureBaseRejected,
      rejectedBadNestedStructureUpdateUnknownField: badNestedStructureUpdateUnknownFieldRejected,
      rejectedBadNestedStructureUpdateConflict: badNestedStructureUpdateConflictRejected,
      rejectedBadBoolIfBranch: badBoolIfBranchRejected,
      rejectedBadRfl: badRflRejected,
      rejectedBadExact: badExactRejected,
      rejectedBadByBlockCommandSemicolon: badByBlockTerminatorRejected,
      rejectedBadIntro: badIntroRejected,
      rejectedBadAssumption: badAssumptionRejected,
      rejectedBadApply: badApplyRejected,
      rejectedBadApplyWrongPremise: badApplyWrongPremiseRejected,
    },
    sourceSha256: sha256File(source),
    outputSha256: sha256File(out),
    failures,
  };
  if (json) console.log(JSON.stringify(result, null, 2));
  else if (failures.length) console.error(`PSLIVE_SMOKE=FAIL ${failures.join(",")}`);
  else console.log(`PSLIVE_SMOKE=PASS checked=${result.checkedDeclarations} emitted=${result.emittedDeclarations.length} sha256=${result.outputSha256}`);
  if (failures.length) process.exit(1);
  return result;
}

function writeSource(dir, name, text) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, text);
  return file;
}
