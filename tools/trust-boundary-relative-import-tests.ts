import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ps-trust-boundary-"));
try {
  fs.mkdirSync(path.join(tmp, "tools"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "tools/check-boundaries.ts"), path.join(tmp, "tools/check-boundaries.ts"));

  fs.mkdirSync(path.join(tmp, "packages/kernel/src"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "packages/runtime/src"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "packages/runtime/src/index.ts"), "export const runtimeLeak = 1;\n");
  fs.writeFileSync(
    path.join(tmp, "packages/kernel/src/Bad.ts"),
    "import { runtimeLeak } from '../../runtime/src/index';\nexport const bad = runtimeLeak;\n",
  );

  const result = spawnSync(process.execPath, ["tools/check-boundaries.ts"], {
    cwd: tmp,
    encoding: "utf8",
    timeout: 10_000,
  });

  assert.notEqual(
    result.status,
    0,
    `expected trust-boundary guard to reject relative import from kernel to runtime, but it passed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /kernel.*runtime|runtime.*kernel|forbidden|outside/i,
    `expected diagnostic to mention forbidden kernel/runtime boundary, got\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  console.log("trust-boundary relative import regression PASS");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
