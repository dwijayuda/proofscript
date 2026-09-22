#!/usr/bin/env node
import fs from "node:fs";

const requiredFiles = [
  "docs/superpowers/specs/2026-09-12-p4-75-cleanup-refactor-design.md",
  "docs/superpowers/plans/2026-09-12-p4-75-cleanup-refactor-roadmap.md",
  "docs/reports/p4/PRODUCTION_P4_75_CLEANUP_REFACTOR_ROADMAP_REPORT.md",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", missing }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: "PASS", checked: requiredFiles.length }, null, 2));
