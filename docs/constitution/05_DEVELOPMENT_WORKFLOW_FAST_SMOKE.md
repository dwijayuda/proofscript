# 05 — Development Workflow: Fast Smoke, Proof-Oriented

## 1. Purpose

ProofScript development must move fast while preserving trust boundaries and future provability.

The workflow is:

```text
small feature -> fail-closed design -> smoke test -> implementation -> build -> smoke -> proof obligation -> report
```

## 2. Development modes

### 2.1 Fast path

Allowed for PSC-1 implementation work.

Requirements:

- small bounded feature;
- no semantic overclaim;
- unsupported cases reject;
- build passes;
- relevant smoke test passes;
- proof obligation added if semantic;
- report updated.

### 2.2 Design path

Required for:

- new language family;
- package boundary change;
- kernel API change;
- certificate format change;
- backend semantic representation change;
- trust-boundary change.

### 2.3 Research path

Used for:

- full Lean equivalence;
- advanced elaboration;
- tactics;
- macros;
- typeclass search;
- compiler correctness proofs.

Research output must not be merged as trusted behavior until specified and checked.

## 3. Minimal smoke commands

Every milestone should run the shortest relevant set:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
npm run test:standalone-small
node tools/pskernel.ts preflight
node tools/pskernel.ts package-audit
node tools/pskernel.ts tarball-smoke
```

If a command does not exist yet, create the smallest useful command.

## 4. Red-green requirement for semantic fixes

When fixing an acceptance/rejection bug:

1. add a failing negative or positive smoke case;
2. run it and record failure;
3. implement the fix;
4. run it again and record pass.

## 5. Proof-obligation requirement

For every semantic implementation, add an obligation before calling the feature stable.

Example:

```json
{
  "id": "PSC1.Kernel.NatLiteral.DefEq",
  "claim": "Nat literals normalize to Nat.zero/Nat.succ constructor form and preserve definitional equality.",
  "status": "lean-proof-target",
  "testStatus": "smoke-tested",
  "trustedAssumptions": ["Nat primitive prelude was admitted by the kernel"]
}
```

## 6. Report format

Every milestone report must include:

```text
Phase:
Status:
Files created:
Files changed:
Files removed from active build:
Commands run:
Results:
Supported features:
Unsupported/fail-closed features:
Proof obligations created:
Trust label:
Next phase:
```

## 7. Speed rules

Do:

- ship small vertical slices;
- keep public APIs narrow;
- prefer explicit unsupported errors;
- preserve artifact determinism;
- add smoke fixtures close to the feature;
- update docs immediately.

Do not:

- wait for full Lean coverage;
- build a huge test suite before the feature exists;
- mix parser/elaborator/kernel/backend in one file;
- accept source because generated JS happens to run;
- hide unsupported behavior behind warnings.

## 8. Coding rules

Use:

- explicit ADTs;
- discriminated unions;
- deterministic JSON schemas;
- stable error codes;
- pure functions where possible;
- small files with one responsibility;
- package-private helpers for internal logic.

Avoid:

- `any` for trusted structures;
- hidden mutation;
- unvalidated JSON;
- stringly typed semantic data;
- dynamic imports in trusted checker path;
- global parser/kernel state.

## 9. Definition of done for PSC-1 feature

A PSC-1 feature is done when:

1. syntax is documented;
2. parser accepts intended source;
3. parser rejects malformed source;
4. elaborator emits core;
5. kernel checks emitted core;
6. backend emits JS if executable;
7. runtime behavior matches declared semantics for smoke cases;
8. unsupported adjacent cases reject;
9. proof obligations exist;
10. report records evidence.
