# K3c-names0 implementation profile

Semantic target: ProofScript Language Reference v0.1 / Lean 4.33.1.

K3c-names0 is a frontend/environment milestone. It adds **no kernel term, declaration kind, typing rule, conversion rule, or trusted namespace state**. The emitted logical Core remains the K3b/v12 Core; hierarchical names are ordinary constant names by the trust boundary.

## Implemented source/environment slice

- brace-shaped `namespace Foo { ... }`;
- nested and dotted namespace names;
- declaration qualification by the active namespace;
- unqualified lookup from the current namespace outward to the root;
- relative-qualified lookup (`B.x` in `namespace A` may resolve as `A.B.x`);
- exact root lookup through `_root_.x`;
- namespace-scoped universe declarations;
- qualified and unqualified self-recursion in the existing structural-recursion slice;
- constructor-pattern lookup using the same namespace candidates, while `.ctor` remains expected-inductive shorthand;
- module ownership/interface metadata over the resulting fully-qualified Core declarations;
- Lean export uses root-unambiguous constant references and preserves inductive self-reference during declaration.

## Trust boundary

Namespace stacks and source-name candidates exist only in parser/elaborator state. The kernel receives only explicit constants such as `A.B.x`. Strict replay never reruns namespace resolution.

## Explicitly deferred

- `open`, `open ... in`, `open scoped`, selective/hiding/renaming opens;
- `section`, section variables, `include`, `omit`, section headers/options;
- private/internal/public declaration visibility;
- `public import`, `meta import`, `import all`;
- package/system module resolution;
- module-scoped/local typeclass visibility;
- persistent compiled interface/cache payload loading.

Unsupported forms must remain `unsupported`, not be approximated as JavaScript/TypeScript namespace objects or property access.

## Differential evidence

The exact Lean 4.33.1 schema-2 corpus includes a namespace semantic-equivalence fixture covering current namespace lookup, nested lookup, qualified names, and `_root_.` shadow escape. K3c-names0 is not a claim of complete Lean name-resolution semantics; the deferred `open`/section/visibility cases require separate pinned differential evidence.
