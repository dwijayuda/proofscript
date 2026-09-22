# KERNEL-mutual-nested-deeper-multiple-recursive-parameter-slots0 profile

Core artifact format: **65**  
Semantic baseline: **Lean 4.33.1**, commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

This profile inherits Core 64 and adds one bounded trusted preprocessing capability: within the already admitted arbitrary-depth indexed `Prop` mutual/nested graph, a checked nested container helper may carry the recursive path in more than one top-level parameter slot.

The trusted checker:

- derives recursive carrier slots from the actual specialized container parameter terms;
- distinguishes direct mutual leaves from nested container child nodes;
- projects all helper parameter specializations into the shared mutual-parameter context;
- discovers helper nodes breadth-first in first-occurrence order;
- deduplicates helper nodes by contextual definitional equality of the complete specialized parameter vector;
- supports dependent parameter telescopes through sequential staged type checking inherited from Core 63;
- rewrites every matching recursive parameter slot using the existing `NestedV45Spec` machinery;
- rechecks the complete enlarged block with the existing direct-mutual checker, which derives positivity, one IH per recursive slot, recursor types and computation rules;
- rejects constructor/index-local nested target capture;
- rejects unsupported malformed or non-projectable recursive graph edges rather than approximating them.

Core ≤64 profiles do not enable this preprocessing path. No artifact metadata can designate a recursive slot or helper edge.

The dedicated exact-Lean gate is `tools/kernel-mutual-nested-deeper-multiple-recursive-parameter-slots-tests.ts`.
