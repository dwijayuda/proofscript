# K3-TB Security and Trust Boundary

`K3-TB` means **trusted-boundary K3 candidate**, not fully formal K3. K3-TB does not mean full formal K3.

The logical evidence is Lean-backed and checkpointed, but execution still relies on infrastructure outside the formal proof:

- Lean 4.33.1 reference kernel;
- Node.js runtime;
- ECMAScript implementation;
- vendored TypeScript compiler;
- offline npm package closure;
- operating system process and filesystem behavior.

## Safe wording

Use this wording:

> ProofScript kernel v71 is a K3-TB trusted-boundary release candidate with 99.5% engineering-track progress and explicit infrastructure assumptions.

Do not use this wording:

> ProofScript kernel v71 is fully formally equal to Lean 4.

## Security consequence

A bug in Node, ECMAScript, the TypeScript compiler, npm closure, or host process/filesystem behavior is outside the current formal proof. The artifact is therefore reviewable and useful, but not yet a zero-assumption formally verified kernel implementation.
