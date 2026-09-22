#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

const run = (args) => {
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(r.stdout);
    process.stderr.write(r.stderr);
    process.exit(r.status ?? 1);
  }
  process.stdout.write(r.stdout);
};

run(["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "tools/pslive.ts", "status", "--json"]);
run(["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "tools/pslive.ts", "smoke", "--json"]);
console.log("PROOFSCRIPT_STANDALONE_SMALL_SUBSET=PASS");
