# KA-85 Primitive Bitwise Recognizer Refinement

Checkpoint: `proofscript-v1-ka85-primitive-bitwise-recognizer-refinement0`

Public version: `1.0.0-pskernel.88`

Baseline: `proofscript-v1-ka84-primitive-condition-reflection-refinement0`

KA-85 adds 2 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive bitwise recognizer theorems. Total formal Lean4Lean bridge obligations: **265**.

## Counted obligations

- `translated_boolOp2_apply_wf`
- `translated_checkNatBitwise_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.


## Verification completed after focused gate

- `npm install --offline --no-audit --no-fund`: passed.
- `npm run build -- --pretty false`: passed.
- `npm run test:pskernel:ka85`: passed.
- `npm run assurance:ka85`: passed.
- `npm run lean:ka85:check`: passed.
- Kernel smoke, standalone-small, PSC kernel-status, PSC bounded conformance: passed.
- Arena corpus preflight: 190 NDJSON fixtures available.
- Arena static non-performance: 26/26 decisive.
- Arena tutorial: 140/140 decisive.
- `npm run verify:arena`: passed.
- Workspace packaging: 36 tarballs; 36/36 SHA-256 entries verified.
- No wrapper timeout was counted as passed.
