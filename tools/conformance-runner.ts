import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "packages/cli/dist/cli.js");

type Expected = number | "nonzero";
type Case = { file: string; args?: string[]; expect: Expected };
const std = ["--std"];
const ok = (file: string, args?: string[]): Case => ({ file, args, expect: 0 });
const nonzero = (file: string, args?: string[]): Case => ({ file, args, expect: "nonzero" });
const code = (file: string, expect: number, args?: string[]): Case => ({ file, args, expect });

const suites = new Map<string, Case[]>([
  ["positive-core", [
    ok("tests/conformance/positive/k0-basic.ps"),
    ok("tests/conformance/positive/k1-universes.ps"),
    ok("tests/conformance/positive/k1-inductives0.ps"),
    ok("tests/conformance/positive/k1c-indexed-eq.ps"),
    ok("tests/conformance/positive/k1d-foundation.ps"),
    ok("tests/conformance/positive/k1d-prelude-user.ps", std),
    ok("tests/conformance/positive/k2a-let.ps"),
    ok("tests/conformance/positive/k2b-transparency.ps"),
  ]],
  ["positive-k2c-k2j", [
    ok("tests/conformance/positive/k2c-structures-match.ps", std),
    ok("tests/conformance/positive/k2d-structural-recursion.ps", std),
    ok("tests/conformance/positive/k2e-equation-clauses.ps", std),
    ok("tests/conformance/positive/k2f-patterns.ps", std),
    ok("tests/conformance/positive/k2g-structure-instances.ps", std),
    ok("tests/conformance/positive/k2h-structure-update.ps", std),
    ok("tests/conformance/positive/k2i-literals.ps", std),
    ok("tests/conformance/positive/k2j-equality.ps", std),
  ]],
  ["positive-k2k-k2r", [
    ok("tests/conformance/positive/k2k-binder-info.ps", std),
    ok("tests/conformance/positive/k2l-implicit-synthesis.ps", std),
    ok("tests/conformance/positive/k2m-unification.ps", std),
    ok("tests/conformance/positive/k2n-typeclass-env.ps", std),
    ok("tests/conformance/positive/k2o-instance-search.ps", std),
    ok("tests/conformance/positive/k2p-parameterized-typeclasses.ps", std),
    ok("tests/conformance/positive/k2q-polymorphic-instances.ps", std),
    ok("tests/conformance/positive/k2r-recursive-instance-search.ps", std),
  ]],
  ["negative-core", [
    nonzero("tests/conformance/negative/k0-type-mismatch.ps"),
    nonzero("tests/conformance/negative/k1-universe-arity.ps"),
    nonzero("tests/conformance/negative/k1-negative-recursion.ps"),
    nonzero("tests/conformance/negative/k1c-nonuniform-parameter.ps"),
    nonzero("tests/conformance/negative/k1d-definition-type-mismatch.ps"),
    nonzero("tests/conformance/negative/k1d-def-final-semicolon.ps"),
    nonzero("tests/conformance/negative/k2a-let-missing-separator.ps"),
    nonzero("tests/conformance/negative/k2a-have-missing-separator.ps"),
    nonzero("tests/conformance/negative/k2b-opaque-no-delta.ps"),
    nonzero("tests/conformance/negative/k2c-structure-large-field.ps"),
    nonzero("tests/conformance/negative/k2c-match-nonexhaustive.ps", std),
  ]],
  ["negative-k2d-k2f", [
    code("tests/conformance/negative/k2d-recursion-growth.ps", 2, std),
    code("tests/conformance/negative/k2d-recursion-not-structural.ps", 2, std),
    code("tests/conformance/negative/k2d-recursion-nonrecursive-field.ps", 2, std),
    nonzero("tests/conformance/negative/k2e-equation-nonexhaustive.ps", std),
    nonzero("tests/conformance/negative/k2e-equation-duplicate.ps", std),
    nonzero("tests/conformance/negative/k2e-equation-arity.ps", std),
    code("tests/conformance/negative/k2e-equation-multiarg.ps", 2, std),
    code("tests/conformance/negative/k2f-wildcard-not-final.ps", 2, std),
    code("tests/conformance/negative/k2f-nonzero-numeric-pattern.ps", 2, std),
    code("tests/conformance/negative/k2f-zero-on-bool.ps", 2, std),
    nonzero("tests/conformance/negative/k2f-duplicate-zero.ps", std),
  ]],
  ["negative-k2g-k2j", [
    nonzero("tests/conformance/negative/k2g-structure-missing-field.ps", std),
    nonzero("tests/conformance/negative/k2g-structure-unknown-field.ps", std),
    nonzero("tests/conformance/negative/k2g-structure-duplicate-field.ps", std),
    code("tests/conformance/negative/k2g-structure-no-expected-type.ps", 2, std),
    nonzero("tests/conformance/negative/k2h-update-unknown-field.ps", std),
    nonzero("tests/conformance/negative/k2h-update-duplicate-field.ps", std),
    code("tests/conformance/negative/k2h-update-nonstructure-base.ps", 2, std),
    code("tests/conformance/negative/k2i-nat-literal-at-bool.ps", 2, std),
    code("tests/conformance/negative/k2i-bool-literal-at-nat.ps", 2, std),
    code("tests/conformance/negative/k2i-app-argument-mismatch.ps", 2, std),
    code("tests/conformance/negative/k2i-large-nat-literal.ps", 2, std),
    code("tests/conformance/negative/k2j-equality-type-mismatch.ps", 1, std),
    code("tests/conformance/negative/k2j-boolean-equality-unsupported.ps", 1, std),
    code("tests/conformance/negative/k2j-equality-without-foundation.ps", 2),
    code("tests/conformance/negative/k2j-chained-equality.ps", 1, std),
  ]],
  ["negative-k2k-k2m", [
    code("tests/conformance/negative/k2k-implicit-synthesis-deferred.ps", 0, std),
    code("tests/conformance/negative/k2k-instance-synthesis-deferred.ps", 1, std),
    code("tests/conformance/negative/k2l-instance-synthesis-deferred.ps", 1, std),
    code("tests/conformance/negative/k2o-instance-missing.ps", 1, std),
    code("tests/conformance/negative/k2k-optional-binder-deferred.ps", 2, std),
    code("tests/conformance/negative/k2k-explicit-at-without-call.ps", 2, std),
    code("tests/conformance/negative/k2l-noninferable-hidden.ps", 2, std),
    code("tests/conformance/negative/k2l-hidden-value-deferred.ps", 2, std),
    code("tests/conformance/negative/k2m-unsolved-meta.ps", 2, std),
    code("tests/conformance/negative/k2m-higher-order-pattern.ps", 2, std),
  ]],
  ["negative-k2n-k2r", [
    code("tests/conformance/negative/k2n-nonclass-instance-binder.ps", 1, std),
    code("tests/conformance/negative/k2n-instance-target-not-class.ps", 1, std),
    code("tests/conformance/negative/k2n-instance-missing-field.ps", 1, std),
    code("tests/conformance/negative/k2n-class-parameters-deferred.ps", 0, std),
    code("tests/conformance/negative/k2n-instance-parameters-deferred.ps", 0, std),
    code("tests/conformance/negative/k2p-parameterized-instance-missing.ps", 1, std),
    code("tests/conformance/negative/k2p-instance-target-arity.ps", 1, std),
    code("tests/conformance/negative/k2p-class-method-sugar-deferred.ps", 2, std),
    code("tests/conformance/negative/k2q-unsolved-polymorphic-instance.ps", 1, std),
    code("tests/conformance/negative/k2q-recursive-instance-prerequisite-deferred.ps", 0, std),
    code("tests/conformance/negative/k2r-instance-search-cycle.ps", 1, std),
    code("tests/conformance/negative/k2r-dependent-instance-target.ps", 2, std),
  ]],
]);

const aliases = new Map<string, string[]>([
  ["positive", ["positive-core", "positive-k2c-k2j", "positive-k2k-k2r"]],
  ["negative", ["negative-core", "negative-k2d-k2f", "negative-k2g-k2j", "negative-k2k-k2m", "negative-k2n-k2r"]],
  ["all", ["positive-core", "positive-k2c-k2j", "positive-k2k-k2r", "negative-core", "negative-k2d-k2f", "negative-k2g-k2j", "negative-k2k-k2m", "negative-k2n-k2r"]],
]);

const args = process.argv.slice(2);
const suiteArgIndex = args.indexOf("--suite");
const selected = suiteArgIndex >= 0 ? args[suiteArgIndex + 1] : "all";
const selectedSuites = aliases.get(selected) ?? [selected];
const caseTimeout = Number(process.env.PROOFSCRIPT_CONFORMANCE_CASE_TIMEOUT_MS ?? "60000");

function runProcess(command: string[], capture = false): Promise<{ status: number; signal: NodeJS.Signals | null; stdout: string; stderr: string; error?: Error; timedOut?: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...command], {
      cwd: root,
      stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "ignore"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    if (capture) {
      child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, caseTimeout);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: -1, signal: null, stdout, stderr, error, timedOut });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ status: timedOut ? 124 : (code ?? -1), signal, stdout, stderr, timedOut });
    });
  });
}


async function runCase(testCase: Case): Promise<void> {
  const command = ["check", testCase.file, ...(testCase.args ?? [])];
  process.stderr.write(`[conformance] ${command.join(" ")}\n`);
  const result = await runProcess(command);
  const pass = testCase.expect === "nonzero" ? result.status !== 0 : result.status === testCase.expect;
  if (!pass || result.error) {
    const replay = await runProcess(command, true);
    console.error(`${testCase.file} expected ${testCase.expect}, got status=${result.status} signal=${result.signal ?? "none"} timedOut=${result.timedOut ? "yes" : "no"} error=${result.error?.message ?? "none"}`);
    if (replay.stdout) console.error(replay.stdout);
    if (replay.stderr) console.error(replay.stderr);
    process.exit(result.status === 0 ? 1 : Math.abs(result.status));
  }
}

let total = 0;
for (const suite of selectedSuites) {
  const cases = suites.get(suite);
  if (!cases) {
    console.error(`unknown conformance suite: ${suite}`);
    console.error(`valid suites: ${Array.from(suites.keys()).join(", ")}, ${Array.from(aliases.keys()).join(", ")}`);
    process.exit(2);
  }
  for (const testCase of cases) await runCase(testCase);
  total += cases.length;
  console.log(`CONFORMANCE_${suite.replace(/-/g, "_").toUpperCase()}=PASS cases=${cases.length}`);
}
console.log(`CONFORMANCE_TOTAL=PASS suites=${selectedSuites.length} cases=${total}`);
