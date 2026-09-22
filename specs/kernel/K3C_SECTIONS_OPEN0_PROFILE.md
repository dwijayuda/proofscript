# K3c-sections-open0 implementation profile

Semantic target: ProofScript Language Reference v0.1 / Lean 4.33.1.

K3c-sections-open0 is a frontend/environment milestone extending frozen K3c-names0. It adds **no kernel term, declaration kind, typing rule, conversion rule, namespace state, section state, or open table**. Source environment operations elaborate away before the trust boundary; logical Core remains artifact v12.

## Implemented source/environment slice

- all frozen K3c-names0 namespace and qualified-resolution semantics;
- brace-shaped `section { ... }` and `section Name { ... }`; section labels do not qualify declarations;
- section-local universe and ordinary-open state with restoration on section exit;
- ordinary `open A;` and `open A B;` namespace commands;
- command-time open-target resolution/validation using current namespace prefixes outward to root;
- lookup precedence validated against pinned Lean 4.33.1:
  1. current namespace and non-root parent prefixes, nearest first;
  2. opened namespaces in opening order;
  3. root;
- `_root_.x` remains an exact root escape and bypasses ordinary candidates;
- opening a namespace contributes qualified suffix candidates (`open A; B.x` may resolve to `A.B.x`);
- open state is restored when either a section or namespace closes;
- imported namespaces can be opened after dependency resolution;
- constructor-pattern resolution uses the same ordinary opened-namespace candidates;
- historical v12 K3b and K3c-names0 metadata/caches are replay-validated under their original producer profile.

## Trust boundary

Namespace/section/open stacks exist only in parser/elaborator state. The kernel receives explicit constants such as `A.B.x`. Strict replay never reruns source name resolution or open/section commands.

## Explicitly deferred

- section variables, `variable`, `include`, `omit`, automatic section-variable generalization;
- selective opens, `hiding`, renaming;
- `open ... in` and other one-command/term open scopes;
- `open scoped` and scoped notation/registrations;
- private/internal/public declaration visibility;
- `public import`, `meta import`, `import all`;
- package/system module resolution;
- module-scoped/local typeclass visibility;
- persistent compiled interface/cache payload loading.

Unsupported forms must remain `unsupported`; they must not be flattened into ordinary `open` or host-language namespace/property semantics.

## Differential evidence

The exact Lean 4.33.1 schema-2 corpus contains 23 cases. The added `sections-open` semantic-equivalence case checks section lexical restoration, ordinary opened-namespace lookup, and precedence against an independently handwritten Lean reference. This is evidence for the implemented slice, not complete Lean namespace/section/open conformance.
