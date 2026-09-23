#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { formatSource } from "@proofscript/formatter";

const root = path.resolve(import.meta.dirname, "..");
const psc = path.join(root, "bin", "psc.mjs");

const messy = [
  "def   answer : Nat:={20+22};",
  "theorem answer_ok:answer=42:=by { rfl }",
  "",
].join("\n");

const first = formatSource(messy);
assert.equal(first.changed, true);
assert.ok(first.tokenCount > 0);
assert.equal(first.commentsPreserved, true);
assert.match(first.formatted, /def answer: Nat := \{20 \+ 22\};/u);
assert.match(first.formatted, /theorem answer_ok: answer = 42 := by \{rfl\}/u);

const second = formatSource(first.formatted);
assert.equal(second.changed, false);
assert.equal(second.formatted, first.formatted, "formatter must be idempotent");

const escaped = formatSource('def text: String := "a\\n\\x01";\n');
assert.match(escaped.formatted, /"a\\n\\x01"/u);
assert.equal(formatSource(escaped.formatted).formatted, escaped.formatted);

const commented = formatSource("-- keep me\ndef   x : Nat:={1+2}; -- tail\n/- outer /- inner -/ done -/\n");
assert.equal(commented.commentsPreserved, true);
assert.match(commented.formatted, /-- keep me/u);
assert.match(commented.formatted, /-- tail/u);
assert.match(commented.formatted, /\/\- outer \/\- inner -\/ done -\//u);
assert.equal(formatSource(commented.formatted).formatted, commented.formatted);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "proofscript-fmt-"));
const file = path.join(tmp, "Main.ps");
const stdoutFile = path.join(tmp, "Stdout.ps");
const commentFile = path.join(tmp, "Comment.ps");
fs.writeFileSync(file, messy);
fs.writeFileSync(stdoutFile, messy);
fs.writeFileSync(commentFile, "-- comment\ndef   x : Nat:={1+2}; -- tail\n");

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [psc, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    expected,
    `${args.join(" ")} exited ${result.status}, expected ${expected}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
  );
  return result;
}

function json(args, expected = 0) {
  return JSON.parse(run([...args, "--json"], expected).stdout);
}

const dirtyCheck = json(["fmt", file, "--check"], 1);
assert.equal(dirtyCheck.status, "rejected");
assert.equal(dirtyCheck.changed, 1);
assert.equal(fs.readFileSync(file, "utf8"), messy, "--check must not write");

const write = json(["fmt", file]);
assert.equal(write.status, "accepted");
assert.equal(write.changed, 1);
assert.equal(fs.readFileSync(file, "utf8"), first.formatted);

const cleanCheck = json(["fmt", file, "--check"]);
assert.equal(cleanCheck.status, "accepted");
assert.equal(cleanCheck.changed, 0);

const stdout = run(["fmt", stdoutFile, "--stdout"]);
assert.equal(stdout.stdout, first.formatted);
assert.equal(fs.readFileSync(stdoutFile, "utf8"), messy, "--stdout must not write");

const commentWrite = json(["fmt", commentFile]);
assert.equal(commentWrite.status, "accepted");
assert.equal(commentWrite.changed, 1);
const formattedCommentFile = fs.readFileSync(commentFile, "utf8");
assert.match(formattedCommentFile, /-- comment/u);
assert.match(formattedCommentFile, /-- tail/u);
assert.match(formattedCommentFile, /def x: Nat := \{1 \+ 2\};/u);
assert.equal(json(["fmt", commentFile, "--check"]).status, "accepted");

console.log("PRODUCT_V1_FORMATTER_TESTS=PASS");
