# ProofScript Software Profile v0 Design

## Intent

Create a small, correctness-focused ProofScript software profile that can become the practical language surface for ordinary verified software while the kernel continues toward Lean compatibility.

## Design decision

The software profile is not a new logic and not a second dialect. It is a profile over the existing ProofScript Core/K3-TB boundary:

```text
.ps source
  -> parser/elaborator
  -> explicit ProofScript Core
  -> standalone ProofScript kernel
  -> checked Core/certificate
  -> optional TypeScript backend artifact
```

The profile deliberately limits ordinary source features to a 20-35 construct budget. Features that require full Lean frontend power, arbitrary metaprogramming, or unproven runtime correspondence are deferred.

## Chosen approach

Use a manifest-driven profile:

- human spec: `docs/profiles/PROOFSCRIPT_SOFTWARE_PROFILE_V0.md`
- machine manifest: `config/proofscript-software-profile-v0.json`
- consistency gate: `tools/software-profile-consistency-tests.ts`
- package script: `npm run test:profile:software`

This gives the project a durable small-language identity without changing kernel computation rules.

## Non-goals

- Do not claim full Lean 4 equivalence.
- Do not implement nested helper iota in this profile-lock checkpoint.
- Do not add new kernel primitives for contracts.
- Do not add JS `any`, unchecked casts, or silent axioms.
- Do not expand arbitrary macro/tactic surface in v0.
