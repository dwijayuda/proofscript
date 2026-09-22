import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pslive = path.join(root, "tools/pslive.ts");
const tmp = path.join(root, "artifacts/test-structure-nested-update.ps");
const jsOut = path.join(root, "artifacts/test-structure-nested-update.js");
fs.mkdirSync(path.dirname(tmp), { recursive: true });

const src = `
structure Point: Type where {
  x: Nat;
  y: Nat;
}
structure Box: Type where {
  p: Point;
  label: Nat;
}
def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }
def boxMoved: Box := { {box with p.x := 7} }
def boxMovedBoth: Box := { {box with p.x := 8, p.y := 6} }
def movedX: Nat := { boxMoved.p.x }
def movedY: Nat := { boxMoved.p.y }
def movedLabel: Nat := { boxMoved.label }
def movedBothX: Nat := { boxMovedBoth.p.x }
def movedBothY: Nat := { boxMovedBoth.p.y }
theorem moved_x_eq_seven: movedX = 7 := by { rfl }
theorem moved_y_eq_two: movedY = 2 := by { rfl }
theorem moved_label_eq_nine: movedLabel = 9 := by { rfl }
theorem moved_both_x_eq_eight: movedBothX = 8 := by { rfl }
theorem moved_both_y_eq_six: movedBothY = 6 := by { rfl }
`;
fs.writeFileSync(tmp, src);

function run(args, expected = 0) {
  const r = spawnSync(process.execPath, [pslive, ...args], { cwd: root, encoding: "utf8" });
  if (r.status !== expected) {
    throw new Error(`${args.join(" ")} exited ${r.status}, expected ${expected}\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);
  }
  return r;
}

const check = JSON.parse(run(["check", tmp, "--json"]).stdout);
assert.equal(check.status, "accepted");
const build = JSON.parse(run(["build-js", tmp, "--out", jsOut, "--json"]).stdout);
assert.equal(build.status, "accepted");
for (const [name, expected] of [["movedX", "7"], ["movedY", "2"], ["movedLabel", "9"], ["movedBothX", "8"], ["movedBothY", "6"]]) {
  const result = JSON.parse(run(["run", tmp, "--call", name, "--json"]).stdout);
  assert.equal(result.status, "accepted");
  assert.equal(result.result, expected, `${name} result`);
}

const badUnknown = path.join(root, "artifacts/test-structure-nested-update-unknown.ps");
fs.writeFileSync(badUnknown, `
structure Point: Type where { x: Nat; y: Nat; }
structure Box: Type where { p: Point; label: Nat; }
def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }
def bad: Box := { {box with p.z := 7} }
`);
run(["check", badUnknown, "--json"], 1);

const badConflict = path.join(root, "artifacts/test-structure-nested-update-conflict.ps");
fs.writeFileSync(badConflict, `
structure Point: Type where { x: Nat; y: Nat; }
structure Box: Type where { p: Point; label: Nat; }
def point: Point := { {x := 1, y := 2} }
def box: Box := { {p := point, label := 9} }
def bad: Box := { {box with p := point, p.x := 7} }
`);
run(["check", badConflict, "--json"], 1);

fs.rmSync(tmp, { force: true });
fs.rmSync(jsOut, { force: true });
fs.rmSync(badUnknown, { force: true });
fs.rmSync(badConflict, { force: true });
console.log("STRUCTURE_NESTED_UPDATE=PASS");
