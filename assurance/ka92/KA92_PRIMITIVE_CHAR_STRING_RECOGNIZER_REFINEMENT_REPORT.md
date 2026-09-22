# KA-92 Primitive Char/String Recognizer Refinement

Checkpoint: `proofscript-v1-ka92-primitive-char-string-recognizer-refinement0`

Public version: `1.0.0-pskernel.95`

Baseline: `proofscript-v1-ka91-primitive-logical-bitwise-recognizer-refinement0`

KA-92 adds 2 strict Lean4Lean bridge obligations over direct non-sorry-backed primitive Char/String recognizer theorems. Total formal Lean4Lean bridge obligations: **283**.

## Counted obligations

- `translated_checkCharOfNat_wf`
- `translated_checkStringOfList_wf`

## Boundary

No full Lean4 equivalence, no executable PSKernel refinement proof, no trusted semantic package change, no Core format change, and no certificate format change.

## Verification completed

- `npm install --offline --no-audit --no-fund`: passed
- `npm run build -- --pretty false`: passed
- `npm run test:pskernel:ka92`: passed
- `npm run assurance:ka92`: passed
- `npm run lean:ka92:check`: passed
- `npm run test:kernel:smoke`: passed
- `npm run test:standalone-small`: passed
- `npm run test:psc:kernel-status`: passed
- `npm run test:psc:conformance-bounded`: passed
- `npm run arena:corpus-preflight`: passed
- `npm run test:arena:static-nonperf`: passed
- `npm run test:arena:tutorial`: passed
- `TERM=xterm npm run verify:arena`: passed
- `npm pack --workspaces --ignore-scripts`: passed
- `sha256sum -c package SHA manifest`: passed
- Workspace package tarballs: **36**
- Package SHA-256 entries: **36/36 verified**
- No wrapper timeout was counted as passed.

## Fresh extract evidence

- Initial source-only residue: node_modules=0, dist=0, *.tsbuildinfo=0, *.tgz=0, nested *.zip=0.
- Fresh extract `npm install --offline --no-audit --no-fund`: passed.
- Fresh extract `npm run build -- --pretty false`: passed.
- Fresh extract `npm run test:pskernel:ka92`: passed.
- Fresh extract `npm run lean:ka92:check`: passed.
