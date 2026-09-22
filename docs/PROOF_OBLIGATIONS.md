# PSKernel TypeScript Proof Obligations

Status: `trusted-boundary`
Proof status: `not-proven`
Semantic baseline: `Lean 4.33.1`
Pinned Lean revision: `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`
Total obligations: 70

## ProofScript.CLI.AuditBundle.Deterministic

- Source area: `CLI`
- Source Lean file: `Main.lean; PSKernel/Replay.lean; PSKernel/Verify.lean`
- Target TypeScript file: `packages/kernel/src/Main.ts; tools/pskernel.ts; packages/kernel/src/PSKernel/Verify/Obligations.ts`
- Target symbol: `pskernelAuditCoreArtifact`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Audit bundles combine replay, certificate, certificate verification, status, and machine-readable obligations into deterministic trusted-boundary evidence.

Supported subset: accepted CoreArtifact inputs

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.CLI.Status.TrustBoundary

- Source area: `CLI`
- Source Lean file: `Main.lean`
- Target TypeScript file: `packages/kernel/src/Main.ts; tools/pskernel.ts`
- Target symbol: `pskernelStatusReport`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Standalone CLI reports implemented and fail-closed slices without claiming full Lean equivalence.

Supported subset: pskernel status and status --json

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.CoreTerm.NatLiteral.TypeAndWHNF

- Source area: `Primitive`
- Source Lean file: `PSKernel/Expr.lean; PSKernel/TypeChecker.lean; PSKernel/Primitive.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Expr.ts; packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `literalToConstructorTerm`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Nat literals infer Nat only when Nat is present and normalize to Nat.zero/Nat.succ constructor chains.

Supported subset: nonnegative safe integer Nat literals

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.CoreTerm.StringLiteral.FailClosed

- Source area: `Primitive`
- Source Lean file: `PSKernel/Primitive.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `inferCore`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: String literals are recognized in serialized Core shape but rejected by trusted checking until logical/runtime String semantics are ported.

Supported subset: shape validation only

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Environment.Assumptions.Propagation

- Source area: `Environment`
- Source Lean file: `PSKernel/Environment.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `collectAssumptions`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Checked declaration summaries expose referenced axiom/opaque assumptions as audit evidence.

Supported subset: constant dependencies reachable in declaration type/value terms

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Environment.Declaration.TypeIsSort

- Source area: `Environment`
- Source Lean file: `PSKernel/Environment.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `checkConstantVal`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: A declaration is admitted only when its declared type itself has a Sort type.

Supported subset: axiom, definition, theorem, opaque, example, inductive family type

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Environment.Definition.BodyCheck

- Source area: `Environment`
- Source Lean file: `PSKernel/Environment.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `checkDefinitionBody`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Definition, theorem, opaque, and example bodies must check against their declared types before admission.

Supported subset: trusted Core declaration values

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Environment.Theorem.PropGuard

- Source area: `Environment`
- Source Lean file: `PSKernel/Environment.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `checkAndAddDeclaration`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Theorem-like declarations must prove propositions, not arbitrary data types.

Supported subset: theorem and example declarations

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Expr.LooseBVar.Rejected

- Source area: `Expr`
- Source Lean file: `PSKernel/Expr.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Expr.ts`
- Target symbol: `containsLooseBVar`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Closed trusted declarations reject loose de Bruijn variables before admission.

Supported subset: direct and replayed Core declarations

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Expr.Substitution.BVar

- Source area: `Expr`
- Source Lean file: `PSKernel/Expr.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Expr.ts`
- Target symbol: `instantiate`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Substitution for de Bruijn variables preserves the intended binder structure for the supported Core term subset.

Supported subset: sort, const, app, lam, pi, let, lit, proj

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Frontend.Bif.BoolRec

- Source area: `Frontend`
- Source Lean file: `ProofScript_Language_Reference_v0.6.1_authoritative_draft.md; ProofScript_Parser_Lowering_API_Contract_v0.6.1.md; PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; packages/backend-typescript/src/index.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseBif; elabBif; emitTerm(Bool.rec)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 Boolean conditional `bif (b) { t } else { e }` is parsed as a source expression, elaborated through the checked Bool/Bool.rec prelude, reduces on Bool.true/Bool.false for rfl smoke, and emits JavaScript conditional code for executable definitions.

Supported subset: direct Bool conditions with expected branch result type; ordinary proposition/Decidable if remains fail-closed

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.DefBody.LocalLetHave

- Source area: `Frontend`
- Source Lean file: `ProofScript_Parser_Lowering_API_Contract_v0.6.1.md; PSKernel/TypeChecker.lean`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; packages/backend-typescript/src/index.ts; tools/proofscript-live-small-smoke.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseDefBodySequence; parseDefBodyBinding; elab(let); emitTerm(let)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 local `let` and body-prefix `have` inside `{ ... }` defBodyBlock parse as body sequence prefixes, lower to checked Core let/zeta behavior, reject malformed final body semicolons, and emit JavaScript IIFE let bindings for executable definitions.

Supported subset: typed and inferred nonrecursive local bindings in def-body blocks; no local function binder sugar or let rec

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Inductive.ExpectedFunctionTypePartialConstructorShorthand

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 constructor namespace and expected-type elaboration behavior`
- Target TypeScript file: `packages/elaborator/src/index.ts; tools/constructor-partial-shorthand-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `tryElabExpectedTypeConstructorShorthand; expectedFunctionCodomainHeadForConstructorShorthand; elab(name/app)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 expected-function-type constructor shorthand such as def mkSome: Nat -> MaybeNat := { some } is elaborated only when normal local/global resolution does not already bind the identifier, the expected function codomain is a known parameterless/indexless inductive, and the partially applied constructor type-checks definitionally against the whole expected function type before JS emission.

Supported subset: unqualified constructor terms and partially applied constructor calls whose remaining type exactly matches a nondependent expected Pi type ending in a parameterless/indexless inductive target; normal local/global names win; no dependent function targets, parameterized/indexed inductives, implicit arguments, typeclass inference, or unchecked JavaScript union constructors

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Inductive.ExpectedTypeConstructorShorthand

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 constructor namespace and expected-type elaboration behavior`
- Target TypeScript file: `packages/elaborator/src/index.ts; tools/constructor-shorthand-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `tryElabExpectedTypeConstructorShorthand; elab(name/app)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 expected-type-directed constructor shorthand such as red and some(7) is elaborated only when normal local/global resolution does not already bind the identifier, the expected type is a known parameterless/indexless inductive, and the generated constructor application type-checks against that expected type before JS emission.

Supported subset: unqualified constructor terms and fully-applied constructor calls for parameterless/indexless source inductives and structures; normal local/global names win; no parameterized inductives, partial constructor inference, ambiguous open-namespace search, or unchecked JavaScript enum/union literals

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Match.BoolRec

- Source area: `Frontend`
- Source Lean file: `ProofScript_Language_Reference_v0.6.1_authoritative_draft.md; ProofScript_Parser_Lowering_API_Contract_v0.6.1.md; PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; packages/backend-typescript/src/index.ts; tools/proofscript-live-small-smoke.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseMatch; resolveSurfaceCasesForRules; elab(match); emitTerm(Bool.rec)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 `match (b) { | true => t | false => e }` over Bool is parsed with branch-local punctuation, elaborated through the checked Bool recursor, rejects non-exhaustive or malformed branches, reduces for rfl smoke, and executes through the existing Bool.rec JavaScript emission.

Supported subset: exhaustive Bool match with true/false or dot-constructor patterns; parameterless/indexless recursor lowering only

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Match.LeanStyleConstructorPatternBinders

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 match alternative syntax`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts`
- Target symbol: `parsePattern; resolveSurfaceCasesForRules`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Lean-style constructor pattern binders such as Nat.succ k and scrutinee-type-scoped succ k are parsed as constructor patterns and elaborated to the same checked recursor applications as the parenthesized constructor pattern slice.

Supported subset: single-discriminant PSC-1 matches over parameterless/indexless inductives; plain identifier binders only; no nested/typed/as-patterns/pattern alternatives beyond the existing match-case subset

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Match.NatLiteralDesugaring

- Source area: `Frontend`
- Source Lean file: `ProofScript_Language_Reference_v0.6.1_authoritative_draft.md; ProofScript_Parser_Lowering_API_Contract_v0.6.1.md; PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; packages/backend-typescript/src/index.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parsePattern(numeric); lowerNatLiteralMatch; elab(match); emitTerm(Nat.rec)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 Nat numeric literal match alternatives above zero are parsed as Nat literal patterns, desugared into nested constructor matches over Nat.zero/Nat.succ, elaborated through checked Nat.rec applications, reduce for rfl smoke, and execute through the Nat.rec JavaScript runtime helper.

Supported subset: finite nonnegative safe-integer Nat literal alternatives with a final '_' catch-all; duplicate literal alternatives reject; mixed constructor/literal Nat matches above zero remain fail-closed

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.DottedProjectionSugar

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 generated structure projections`
- Target TypeScript file: `packages/elaborator/src/index.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `tryElabDottedStructureProjection; elab(name)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Dotted PSC-1 structure projection syntax x.field is elaborated only after generated structure projections exist, by inferring the base term type and translating to the checked projection application Structure.field(x); it does not introduce target-backend-only field access semantics.

Supported subset: parameterless source structures/classes already known in the current compilation unit; single field segment at each step; no parameterized structures, dependent projections, namespace disambiguation beyond existing name resolution, or arbitrary JavaScript property access

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.LiteralFieldPunning

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 structure instance syntax; Lean 4 generated structure constructors`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; tools/structure-literal-field-punning-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseStructureInstance(structInst field punning); elab(structInst)`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 structure literal field punning such as {x, y} is parsed as {x := x, y := y}; the punned identifiers are resolved and type-checked normally against the expected structure field types before constructor application and JS emission.

Supported subset: same-name punned fields in expected-type-directed structure literals for known parameterless single-constructor source structures; missing punned identifiers, wrong punned value types, duplicate fields, unknown fields, dependent structures, and dynamic JavaScript object literals reject or remain unsupported

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.NestedUpdateFieldPath

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 nested structure update syntax; Lean 4 generated structure projections`
- Target TypeScript file: `packages/elaborator/src/index.ts; tools/structure-nested-update-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `elaborateStructureUpdateCore`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 nested structure update field paths such as { box with p.x := v } are elaborated by reconstructing the outer structure with generated checked projections, recursively reconstructing the nested structure field, and then executing through the existing frozen-record runtime after Core checking.

Supported subset: bounded field paths over parameterless single-constructor source structures; no direct+nested update conflict for the same top-level field; no parameterized/dependent structures or dynamic JavaScript property mutation

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.ParenthesizedUpdateBase

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 structure update syntax; Lean 4 generated structure projections`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; tools/structure-update-base-expression-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseStructureInstance(parenthesized structUpdate); elaborateStructureUpdateCore`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 parenthesized structure update bases such as {(point) with x := v} and {(box.p) with y := v} are parsed as checked base terms, elaborated through the existing structure-update reconstruction path, and then verified by kernel inference before JS emission.

Supported subset: parenthesized checked base expressions whose inferred type is a known parameterless single-constructor source structure; no unparenthesized arbitrary update base parser yet; no parameterized/dependent structures or dynamic JavaScript property mutation

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.UpdateFieldPunning

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 structure update syntax; Lean 4 generated structure projections`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; tools/structure-update-field-punning-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseStructureUpdateFields; elaborateStructureUpdateCore`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 structure update field punning such as {p with x} is parsed as {p with x := x}, then follows the existing checked structure-update elaboration path through generated projections/constructors and kernel inference before JS emission.

Supported subset: same-name punned update fields over known parameterless single-constructor source structures; the punned identifier must resolve as an ordinary checked term in scope; unknown fields, missing values, duplicate fields, dependent structures, and dynamic JavaScript property mutation reject

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Frontend.Structure.UpdateLowering

- Source area: `Frontend`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 structure update syntax; Lean 4 generated structure projections`
- Target TypeScript file: `packages/parser/src/index.ts; packages/elaborator/src/index.ts; packages/backend-typescript/src/index.ts; tools/structure-update-runtime-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `parseStructureInstance(structUpdate); elab(structUpdate); Struct_ctor; Struct_proj`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 structure update syntax { base with field := value } is accepted only for known parameterless source structures, lowers to the generated checked constructor while reconstructing unchanged fields through generated checked projections, reduces for rfl smoke, and executes through the existing frozen-record structure runtime encoding.

Supported subset: single-base identifier updates plus parenthesized checked base expressions for parameterless single-constructor structures with explicit direct and bounded nested field-path updates; duplicate/unknown fields and non-structure bases reject; no parameterized/dependent structure update elaboration yet

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Inductive.Admission.ConstructorTarget

- Source area: `Inductive`
- Source Lean file: `PSKernel/Inductive/Add.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts; packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `validateConstructorTarget`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Constructors must target the declared inductive family with matching universe arguments and uniform parameters.

Supported subset: implemented simple, parameterized, and Eq slices

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Inductive.Admission.FamilyTelescope

- Source area: `Inductive`
- Source Lean file: `PSKernel/Inductive/Add.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts; packages/kernel/src/PSKernel/Environment.ts`
- Target symbol: `checkInductiveDeclaration`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Inductive family telescope and codomain are checked before adding the family and generated declarations.

Supported subset: non-mutual and limited mutual shape validation; Sort codomain required

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Inductive.Positivity.Conservative

- Source area: `Inductive`
- Source Lean file: `PSKernel/Inductive/Add.lean; PSKernel/Theory/Inductive.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts`
- Target symbol: `checkStrictPositivity`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The standalone checker rejects obvious negative recursive occurrences and fails closed for not-yet-proven nested/container positivity.

Supported subset: direct positive recursive fields; nested/container positivity unsupported

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Kernel.CoreMaturity.P48ConformanceReplacement

- Source area: `Kernel`
- Source Lean file: `PSKernel/TypeChecker.lean; PSKernel/LocalContext.lean; PSKernel/Environment.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts; packages/kernel/src/PSKernel/EquivManager.ts; packages/kernel/src/PSKernel/LocalContext.ts; packages/kernel/src/PSKernel/Environment/Basic.ts; tools/pskernel-typechecker-conformance.ts; tools/pskernel-context-conformance.ts; tools/pskernel-reference-runner-tests.ts; tools/pskernel-reference-compare.ts`
- Target symbol: `isDefEqCore; whnfCore; inferProjectionCore; EquivManager; LocalContext; pskernel-reference-corpus`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The current standalone kernel uses the more mature P4.48 core-kernel implementation for context-scoped definitional equality, local definition unfolding, unit-like equality, neutral projection congruence, function eta, binder-annotation-insensitive Pi/lambda equality, and dependent single-constructor projection typing, while preserving the newer P4.63 fail-closed opaque-transparency boundary and frontend/runtime slices.

Supported subset: trusted-boundary PSKernel-derived Core checker slice exercised by 42 recovered conformance/protocol tests plus the existing P4.63 smoke/governance suite; full Lean 4 equivalence, arbitrary native .olean replay, indexed/mutual/nested inductive completeness, and opaque unfolding remain unsupported/fail-closed

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Level.MVar.FailClosed

- Source area: `Level`
- Source Lean file: `PSKernel/Level.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Level.ts`
- Target symbol: `assertNoLevelMVar`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Unresolved level metavariables cannot enter trusted checked declarations.

Supported subset: serialized trusted Core artifacts and direct declaration admission

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Level.Normalize.DefEq

- Source area: `Level`
- Source Lean file: `PSKernel/Level.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Level.ts`
- Target symbol: `levelDefEq`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: TypeScript level normalization and equality accept the same supported universe-level equations as the pskernel level checker slice.

Supported subset: zero, succ, max, imax, named params; unresolved universe metavariables rejected before checking

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Primitive.Prelude.Admission

- Source area: `Primitive`
- Source Lean file: `PSKernel/Primitive.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Primitive.ts`
- Target symbol: `installCorePrimitives`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Unit, Bool, Nat, and Eq primitive declarations are generated and admitted through the same kernel boundary as ordinary declarations.

Supported subset: core primitive prelude profile

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Projection.SimpleStructure.Iota

- Source area: `Projection`
- Source Lean file: `PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `tryProjectCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Projection from a matching constructor application reduces to the selected constructor field.

Supported subset: single-constructor non-indexed structures

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Projection.SimpleStructure.Type

- Source area: `Projection`
- Source Lean file: `PSKernel/TypeChecker.lean; PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `inferProjectionCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Projection typing returns the selected constructor field type instantiated by major premise parameters.

Supported subset: single-constructor non-indexed nondependent-field structures

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Quot.Bootstrap.Canonical

- Source area: `Quot`
- Source Lean file: `PSKernel/Quot.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Quot.ts`
- Target symbol: `installQuotientPrimitives`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Quotient primitive installation requires canonical Eq/Eq.refl prerequisites and rejects arbitrary quotient markers.

Supported subset: core+quot prelude bootstrap

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Quot.IndBeta

- Source area: `Quot`
- Source Lean file: `PSKernel/Quot.lean; PSKernel/Theory/Quot.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Quot.ts`
- Target symbol: `tryQuotReduce`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Quot.ind over Quot.mk reduces to applying the minor proof to the representative.

Supported subset: fully applied installed Quot.ind over matching Quot.mk

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Quot.LiftBeta

- Source area: `Quot`
- Source Lean file: `PSKernel/Quot.lean; PSKernel/Theory/Quot.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Quot.ts`
- Target symbol: `tryQuotReduce`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Quot.lift over Quot.mk reduces to applying the lifted function to the representative.

Supported subset: fully applied installed Quot.lift over matching Quot.mk

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Recursor.Eq.ReflIota

- Source area: `Recursor`
- Source Lean file: `PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Inductive/Reduce.ts`
- Target symbol: `tryInductiveReduceRec`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Eq.rec over Eq.refl reduces to the refl case in the canonical supported slice.

Supported subset: typed-eq-indexed recursor metadata with refl major premise

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Recursor.Eq.Type

- Source area: `Recursor`
- Source Lean file: `PSKernel/Inductive/Add.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts`
- Target symbol: `synthesizeEqRecursorType`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Canonical Eq gets the supported indexed equality eliminator type.

Supported subset: canonical Eq with Eq.refl only; general indexed recursors unsupported

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Recursor.ParameterizedSimpleNonIndexed.Type

- Source area: `Recursor`
- Source Lean file: `PSKernel/Inductive/Add.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts`
- Target symbol: `synthesizeSimpleRecursorType`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Parameterized non-indexed generated recursor types include uniform parameters, motive, minors, major premise, and motive result.

Supported subset: nondependent uniform parameters; no indices; no mutual/nested families

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Recursor.SimpleNonIndexed.Iota

- Source area: `Recursor`
- Source Lean file: `PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Inductive/Reduce.ts`
- Target symbol: `tryInductiveReduceRec`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Fully applied simple recursors reduce on matching constructor major premises with field and IH arguments.

Supported subset: typed-simple-nonindexed recursor metadata only

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Recursor.SimpleNonIndexed.Type

- Source area: `Recursor`
- Source Lean file: `PSKernel/Inductive/Add.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Declaration.ts`
- Target symbol: `synthesizeSimpleRecursorType`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Simple non-indexed generated recursor types match the Lean-style eliminator shape for the supported slice.

Supported subset: non-mutual, no indices, no dependent fields, direct recursive fields

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Release.Delivery.ArchiveFreshExtractVerification

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; Main.lean; release evidence scripts`
- Target TypeScript file: `tools/pskernel-kernel-delivery-archive-verify.ts; tools/pskernel.ts`
- Target symbol: `verifyProofScriptDeliveryArchive; pskernel verify-delivery-archive`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: A distributed release zip can be verified by extracting it into a fresh temporary directory, bootstrapping local workspace links, building from that extracted tree, checking trusted-boundary kernel status, and rerunning delivery-bootstrap/source-tree evidence inside the extracted project.

Supported subset: bounded fresh-extract verification for ProofScript standalone release archives; full recursive delivery verification is available via --full but remains trusted-boundary evidence, not a formal Lean equivalence proof

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Release.Manifest.CertificateBundleBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; Main.lean; release evidence scripts`
- Target TypeScript file: `tools/pskernel-kernel-release-manifest.ts; tools/pskernel.ts; packages/kernel/src/PSKernel/Replay.ts`
- Target symbol: `runPSKernelKernelReleaseManifest; verifyPSKernelKernelReleaseManifest; pskernel release-manifest; pskernel verify-release-manifest`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The release manifest binds the deterministic certificate bundle hash, certificate-bundle audit hash, proof-obligation hash, and environment snapshot hash into the final release evidence hash; verification rejects malformed or forged release-manifest payloads and can fresh-regenerate expected release evidence.

Supported subset: trusted-boundary release evidence for the supported standalone kernel package and canonical smoke CoreArtifact

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Release.Manifest.DeliveryBootstrapBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; Main.lean; release evidence scripts`
- Target TypeScript file: `tools/pskernel-kernel-delivery-bootstrap.ts; tools/pskernel-kernel-release-manifest.ts; tools/pskernel.ts`
- Target symbol: `runProofScriptDeliveryBootstrapVerification; runPSKernelKernelReleaseManifest; verifyPSKernelKernelReleaseManifest; pskernel delivery-bootstrap`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The release manifest binds a manifestless fresh-extract delivery-bootstrap evidence hash, and fresh-bound manifest verification recomputes that bootstrap hash without recursively depending on full delivery verification.

Supported subset: trusted-boundary release delivery bootstrap checks for local workspace linking, kernel trust status, source-tree evidence, and source-archive evidence

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Release.Manifest.SourceArchiveBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; Main.lean; release evidence scripts`
- Target TypeScript file: `tools/pskernel-kernel-release-archive.ts; tools/pskernel-kernel-release-manifest.ts; tools/pskernel.ts`
- Target symbol: `createProofScriptReleaseArchive; verifyProofScriptReleaseArchiveEvidence; runPSKernelKernelReleaseManifest; verifyPSKernelKernelReleaseManifest; pskernel source-archive; pskernel verify-source-archive`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The release archive evidence binds a deterministic zip archive hash to the release-critical source tree hash and payload hash, and the release manifest binds those source-archive hashes into fresh-bound release verification.

Supported subset: release-critical source archive generated from the deterministic source-tree profile with fixed timestamps and sorted file payloads

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Release.Manifest.SourceTreeBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; Main.lean; release evidence scripts`
- Target TypeScript file: `tools/pskernel-kernel-source-tree.ts; tools/pskernel-kernel-release-manifest.ts; tools/pskernel.ts`
- Target symbol: `snapshotProofScriptSourceTree; verifyProofScriptSourceTreeEvidence; runPSKernelKernelReleaseManifest; verifyPSKernelKernelReleaseManifest; pskernel source-tree; pskernel verify-source-tree`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The release manifest binds a deterministic release-critical source tree inventory hash; verification rejects forged source-tree evidence and fresh-bound release verification recomputes the source-tree hash from the current workspace.

Supported subset: release-critical TypeScript, ProofScript, specification, and governance source files selected by the deterministic source-tree profile

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.ReleasePackage.DeterministicReleaseManifest

- Source area: `CLI`
- Source Lean file: `Main.lean; PSKernel.lean; release evidence manifest`
- Target TypeScript file: `tools/pskernel-kernel-release-manifest.ts; tools/pskernel.ts; docs/PSKERNEL_TS_RELEASE_MANIFEST.json`
- Target symbol: `runPSKernelKernelReleaseManifest`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The release manifest deterministically ties trusted-boundary status, proof obligations, preflight, package audit, tarball install smoke, standalone audit bundle, and package hashes into one auditable evidence artifact.

Supported subset: release evidence only; does not prove Lean equivalence or expand accepted kernel semantics

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.ReleasePackage.InstallFromTarballSmoke

- Source area: `CLI`
- Source Lean file: `Main.lean; PSKernel.lean; release package manifest`
- Target TypeScript file: `tools/pskernel-kernel-tarball-smoke.ts; tools/pskernel.ts; tools/pskernel-kernel-preflight.ts`
- Target symbol: `runPSKernelKernelTarballSmoke`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The packed @proofscript/kernel tarball must install into a fresh project and expose replay, certificate, status, and proof-obligation APIs from dist without depending on monorepo source files.

Supported subset: npm pack plus fresh npm install smoke for the pskernel-derived TypeScript kernel package

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.ReleasePackage.NpmContentsAudit

- Source area: `CLI`
- Source Lean file: `Main.lean; PSKernel.lean; release package manifest`
- Target TypeScript file: `tools/pskernel-kernel-package-audit.ts; tools/pskernel.ts; packages/kernel/package.json; packages/kernel/docs/*`
- Target symbol: `runPSKernelKernelPackageAudit`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: The publishable @proofscript/kernel package must include built dist entrypoints plus trust-boundary, porting-map, preflight, and proof-obligation evidence while excluding legacy compact-kernel files.

Supported subset: npm pack dry-run contents for the pskernel-derived TypeScript kernel package

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.ReleasePreflight.MirrorAudit

- Source area: `CLI`
- Source Lean file: `PSKernel.lean; Main.lean; pskernel source inventory`
- Target TypeScript file: `tools/pskernel-kernel-preflight.ts; tools/pskernel.ts; docs/PSKERNEL_TS_RELEASE_PREFLIGHT.json`
- Target symbol: `runPSKernelKernelPreflight`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Release preflight validates that the pskernel source mirror, trusted-boundary status, proof-obligation catalog, active package entrypoints, and deterministic audit evidence remain coherent before packaging.

Supported subset: structural mirror completeness, proof-obligation metadata, deterministic accepted smoke artifact audit, and active dist legacy-file absence

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Replay.Artifact.ShapeValidation

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts`
- Target symbol: `validateCoreArtifact`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Replay rejects malformed artifact, declaration, term, level, typeclass, and module metadata shapes before trusted checking.

Supported subset: CoreArtifact formatVersion 1

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Replay.Certificate.Deterministic

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts`
- Target symbol: `certifyCoreArtifact`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Replay certificates bind the artifact hash and semantic summary hash produced by deterministic canonicalization.

Supported subset: accepted replay artifacts only; evidence not cryptographic signature or proof

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Replay.Certificate.EnvironmentSnapshotBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; PSKernel/Environment/Basic.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts; tools/pskernel.ts`
- Target symbol: `certifyCoreArtifact; verifyCoreReplayCertificate; CoreReplayCertificate.environmentSha256`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Accepted replay certificates bind artifact SHA-256, semantic summary SHA-256, and the final deterministic environment snapshot SHA-256, and certificate verification rejects stale or forged environment hashes by fresh replay.

Supported subset: trusted-boundary CoreArtifact replay environments representable by snapshotEnvironment in the pskernel-derived TypeScript kernel slice

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Replay.Certificate.VerifyByFreshReplay

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts; packages/kernel/src/Main.ts; tools/pskernel.ts`
- Target symbol: `verifyCoreReplayCertificate`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Certificate verification reruns replay/certification and accepts only when supplied evidence exactly matches fresh trusted-boundary replay evidence.

Supported subset: CoreArtifact formatVersion 1 accepted artifacts

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Replay.CertificateBundle.DeterministicVerification

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; PSKernel/Environment/Basic.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts; packages/kernel/src/Main.ts; tools/pskernel.ts`
- Target symbol: `createCoreReplayCertificateBundle; verifyCoreReplayCertificateBundle; pskernel bundle; pskernel verify-bundle`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Accepted certificate bundles deterministically bind the canonical CoreArtifact, replay certificate, certificate verification result, final environment snapshot, and audit hash; verification rejects stale, forged, or noncanonical bundle payloads by fresh replay.

Supported subset: trusted-boundary CoreArtifact replay and environment snapshot bundle evidence for the pskernel-derived TypeScript kernel slice

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Replay.CertificateBundle.ObligationCatalogBinding

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; PSKernel/Verify.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts; packages/kernel/src/PSKernel/Verify/Obligations.ts; tools/pskernel.ts`
- Target symbol: `CoreReplayCertificateBundle.obligationsSha256; verifyCoreReplayCertificateBundle; proofObligationReport`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Accepted certificate bundles expose and bind the deterministic proof-obligation catalog hash separately from the audit hash, and verification rejects forged or stale obligation-catalog hashes by fresh replay.

Supported subset: trusted-boundary certificate bundle evidence and machine-readable obligation catalog for the supported standalone kernel slice

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Replay.EnvironmentSnapshot.Deterministic

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; PSKernel/Environment/Basic.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts; packages/kernel/src/PSKernel/Environment/Basic.ts; packages/kernel/src/Main.ts; tools/pskernel.ts`
- Target symbol: `snapshotEnvironment; checkCoreDeclarationsWithSnapshot; replayCoreArtifactWithSnapshot; pskernelSnapshotCoreArtifact; pskernel snapshot`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Accepted replay and check-core executions can emit deterministic environment snapshot JSON and SHA-256 evidence for the final trusted environment, including admitted constants, checked declarations, generated names, assumptions, and prelude state.

Supported subset: trusted-boundary environment entries currently representable by ConstantInfo and CheckedDeclaration in the pskernel-derived TypeScript kernel slice

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Replay.ModuleMetadata.CrossCheck

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts`
- Target symbol: `validateModulesMetadataAgainstSummary`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Module declarations and exports must reference checked, generated, or prelude-installed names.

Supported subset: serialized module metadata side table

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Replay.Prelude.Deterministic

- Source area: `Replay`
- Source Lean file: `PSKernel/Replay.lean; PSKernel/Primitive.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/Replay.ts`
- Target symbol: `replayCoreArtifact`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Declared prelude profile installs a deterministic primitive base environment before replaying serialized declarations.

Supported subset: none, core, core+quot prelude profiles

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Runtime.Inductive.NonrecursiveMultiConstructorMatchEncoding

- Source area: `Runtime`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 recursor semantics for simple nonrecursive inductives`
- Target TypeScript file: `packages/backend-typescript/src/index.ts; packages/runtime/src/index.ts; tools/user-inductive-match-runtime-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `collectSimpleRecursors; emitTerm(Color.rec/MaybeNat.rec); Inductive_rec`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 matches over parameterless/indexless nonrecursive multi-constructor user inductives are elaborated to checked recursor applications, then emitted as deterministic frozen tagged-record dispatch only after Core checking; the runtime validates inductive owner, constructor index, field arity, and curried branch application.

Supported subset: nonrecursive parameterless/indexless user inductives with first-order fields; constructor tags and payloads use the existing frozen-record encoding; recursive fields are handled only by the separate simple self-recursive recursor obligation; dependent motives at runtime, indexed inductives, parameters, mutual/nested inductives, and unchecked JavaScript union interop remain unsupported/fail-closed

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Runtime.Inductive.SimpleSelfRecursiveRecursorEncoding

- Source area: `Runtime`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 recursor semantics for simple self-recursive inductives`
- Target TypeScript file: `packages/backend-typescript/src/index.ts; packages/runtime/src/index.ts; tools/user-recursive-inductive-runtime-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `collectSimpleRecursors; emitTerm(NatList.rec); Inductive_rec`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 matches and primitive-recursive definitions over simple self-recursive parameterless/indexless inductives are elaborated to checked recursor applications. JS emission records direct owner-typed recursive field positions, and the runtime computes the corresponding induction hypotheses structurally before applying each checked curried branch.

Supported subset: direct first-order recursive fields whose type is exactly the inductive owner, with no parameters, indices, mutual recursion, nested recursion through containers/functions, dependent motives at runtime, or unchecked JavaScript recursion interop

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Runtime.Structure.ConstructorProjectionEncoding

- Source area: `Runtime`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 structures as single-constructor inductives with generated projections`
- Target TypeScript file: `packages/backend-typescript/src/index.ts; packages/runtime/src/index.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `emitJavaScriptModule; Struct_mk; Struct_ctor; Struct_proj`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Parameterless PSC-1 structure instances are elaborated to checked constructor applications, and generated field projections are emitted as deterministic frozen-record projection functions whose executable observations agree with the checked Core projection/reduction behavior for the accepted subset.

Supported subset: parameterless single-constructor structures with explicit fields and generated first-order projections; no parameters, no dependent fields, no nested structure runtime interop beyond checked Core values

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.Runtime.Structure.SingleConstructorMatchEncoding

- Source area: `Runtime`
- Source Lean file: `ProofScript grammar/parser specification; Lean 4 recursor semantics for single-constructor structures`
- Target TypeScript file: `packages/backend-typescript/src/index.ts; packages/runtime/src/index.ts; tools/structure-match-runtime-tests.ts; tools/pslive-smoke-lib.ts; tools/reference-language-governance-smoke.ts`
- Target symbol: `collectSimpleNonrecursiveRecursors; emitTerm(Point.rec); Struct_rec`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: PSC-1 matches over parameterless single-constructor source structures are elaborated to checked recursor applications, then emitted as deterministic frozen-record destructuring only after Core checking; the runtime validates the expected constructor tag and field arity before applying the curried branch.

Supported subset: parameterless/indexless single-constructor structures and inductives with explicit first-order fields; multi-constructor runtime coverage is handled separately for nonrecursive user inductives; no dependent motives at runtime and no unchecked JavaScript destructuring

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.StandaloneSmallSubset.LiveWithoutLean4

- Source area: `Frontend`
- Source Lean file: `ProofScript_Language_Reference_v0.6.1_authoritative_draft.md; ProofScript_Parser_Lowering_API_Contract_v0.6.1.md`
- Target TypeScript file: `tools/pslive.ts; tools/proofscript-live-small-smoke.ts; examples/standalone-small/src/Main.ps`
- Target symbol: `pslive check/build-js/run/smoke`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: A small standalone .ps subset is parsed, elaborated to checked Core, certified by the pskernel-derived TypeScript kernel, and emitted to executable JS without invoking Lean4.

Supported subset: explicit-typed def over Nat/Bool/Unit/Eq prelude, Nat literals, Nat.succ, Nat.add, local let/have def-body sequencing, Boolean bif, simple Bool match, and Nat literal/catch-all matches via checked recursors, direct calls to earlier checked definitions, rfl/exact/intro/assumption/apply proof smoke over checked Prop/Eq goals

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.TypeChecker.Check.Cumulativity

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean; PSKernel/Theory/LevelSat.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `checkCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Checking accepts Sort cumulativity when the implemented level ordering justifies the relation.

Supported subset: sort-level cumulativity over implemented levels

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.TypeChecker.DefEq.FunctionEta

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `isDefEqCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Conservative Pi/function eta recognizes f as equal to fun x => f x when f safely infers to a compatible Pi type.

Supported subset: single-step function eta for supported Core terms

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.TypeChecker.DefEq.ProofIrrelevance

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean; PSKernel/Theory/Typing/UniqueTyping.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `isDefEqCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Two terms safely inferred to the same proposition are treated definitionally equal in the supported proof-irrelevance slice.

Supported subset: same inferred Prop type under current environment and local context

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.TypeChecker.DefEq.StructureEta

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean; PSKernel/Inductive/Reduce.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `isDefEqCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Simple single-constructor projection-supported structures satisfy eta in the implemented slice.

Supported subset: non-indexed, one-constructor, nondependent-field structure-like inductives

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.TypeChecker.Infer.SortPiLamAppLet

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `inferType`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Inference for Sort, constants, Pi, lambda, application, and let follows the pskernel kernel typing skeleton for the supported subset.

Supported subset: Core terms after elaboration; no parser, tactic, typeclass, or termination search

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
- Semantic target is pinned Lean 4.33.1, not moving Lean latest

## ProofScript.TypeChecker.WHNF.BetaZetaDelta

- Source area: `TypeChecker`
- Source Lean file: `PSKernel/TypeChecker.lean`
- Target TypeScript file: `packages/kernel/src/PSKernel/TypeChecker.ts`
- Target symbol: `whnfCore`
- Status: `lean-proof-target`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: WHNF implements beta, zeta, and controlled delta reduction for definitions/theorems while keeping opaques closed.

Supported subset: trusted Core terms; transparency reducible/default/all; no native compiler reductions

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed

## ProofScript.Unsupported.FullFrontend.FailClosed

- Source area: `Unsupported`
- Source Lean file: `ProofScript grammar/parser specification; PSKernel frontend boundary`
- Target TypeScript file: `packages/kernel/src/PSKernel/*`
- Target symbol: `KernelUnsupportedError`
- Status: `informal-spec`
- Proof status: `not-proven`
- Test status: `smoke`

Semantic relation: Full parser, elaborator, macro, tactic, typeclass search, native .olean replay, and unsupported primitives remain outside the trusted kernel slice.

Supported subset: explicit unsupported errors or neutral reduction only

Trusted assumptions:
- TypeScript implementation is trusted-boundary evidence only until related Lean proof is completed
