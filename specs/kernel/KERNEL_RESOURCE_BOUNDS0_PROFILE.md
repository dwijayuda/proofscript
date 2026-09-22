# KERNEL-resource-bounds0 profile

- ProofScript Language Reference: v0.1.6
- Lean semantic baseline: 4.33.1
- Lean release commit: `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`
- Core artifact: v68
- Certificate: v2
- Previous frozen kernel profile: `KERNEL-conversion-final-audit0` / v67

## Purpose

Close the final audited trusted-kernel row by making resource exhaustion bounded, deterministic, replay-safe, and distinguishable from logical rejection or implementation faults. These ceilings are ProofScript implementation-security policy; they are not asserted to match Lean's operational resource ceilings.

## v68 bounds

- artifact decode nesting: 1024;
- direct-Core term/level nesting: 1024;
- direct-Core term nodes: 1,000,000;
- direct-Core level nodes: 1,000,000;
- declarations: 10,000;
- mutual members: 256;
- constructors: 10,000 per checked declaration/member family as enforced by preflight;
- definitional-equality recursion: 512;
- WHNF fuel: 20,000;
- positivity / mutual positivity traversal: existing typed 4096-fuel limits;
- mutual/nested positive Pi traversal: existing typed 4096-fuel limit;
- mutual/nested helper specializations: 512;
- standalone verifier input/binding bytes: 64 MiB.

## Outcome taxonomy

Resource ceilings produce `resource_exhausted`; malformed logical Core produces `rejected`; unsupported features produce `unsupported`; unexpected runtime defects produce `implementation_error`. `psverify` maps resource exhaustion to exit code 3.

## Historical isolation

Core v67 retains its previous decode ceiling/policy. The v68 stack-safe decoder and direct-Core preflight do not silently reinterpret historical artifacts.

## Completion evidence

`tools/kernel-resource-bounds-tests.ts` covers normal replay, deep term/level decode, direct-AST bypass, declaration flood, defEq recursion, WHNF fuel, a generated 513-specialization nonlinear helper graph, oversized verifier input, malformed Core taxonomy, stable CLI exit code, plugin-free replay, and v67 isolation. Exact Lean semantic regression remains a separate 25-case source corpus plus 55 semantic kernel milestone families through v67.
