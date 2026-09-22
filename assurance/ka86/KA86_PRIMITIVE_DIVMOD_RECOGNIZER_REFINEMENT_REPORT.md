# KA-86 Primitive Div/Mod Recognizer Refinement

Checkpoint: `proofscript-v1-ka86-primitive-divmod-recognizer-refinement0`

Public version: `1.0.0-pskernel.89`

Baseline: `proofscript-v1-ka85-primitive-bitwise-recognizer-refinement0`

KA-86 adds 2 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Nat.mod/Nat.div recognizer theorems. Total formal Lean4Lean bridge obligations: **267**.

## Counted obligations

- `translated_checkNatMod_wf`
- `translated_checkNatDiv_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.


## Verification completed after focused gate

- `npm install --offline --no-audit --no-fund`: passed.
- `npm run build -- --pretty false`: passed.
- `npm run test:pskernel:ka86`: passed.
- `npm run assurance:ka86`: passed.
- `npm run lean:ka86:check`: passed.
- Kernel smoke, standalone-small, PSC kernel-status, PSC bounded conformance: passed.
- Arena corpus preflight: 190 NDJSON fixtures available.
- Arena static non-performance: 26/26 decisive.
- Arena tutorial: 140/140 decisive.
- `npm run verify:arena`: passed.
- Workspace packaging: 36 tarballs; 36/36 SHA-256 entries verified.
- No wrapper timeout was counted as passed.
