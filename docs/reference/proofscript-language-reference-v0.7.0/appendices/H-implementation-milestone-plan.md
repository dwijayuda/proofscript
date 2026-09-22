# Appendix H — Implementation milestone plan

## H1. Kernel ecosystem
1. stabilize pskernel public API;
2. close selected Lean 4.34 kernel assurance gates;
3. portable checked modules;
4. reusable conformance/Arena package;
5. pinned Lean export transport;
6. CLI/browser host layers.

## H2. Theorem-prover frontend
1. `@proofscript/syntax`;
2. `@proofscript/pretty`;
3. `@proofscript/meta`;
4. `@proofscript/elab`;
5. `@proofscript/tactic`.

All remain outside the default kernel TCB; final declarations are rechecked.

## H3. Executable software profile
1. `@proofscript/compiler-ir`;
2. erasure/lowering;
3. `@proofscript/runtime`;
4. `@proofscript/backend-ts`;
5. differential runtime/conformance tests.

## H4. Incremental tooling
1. `@proofscript/language` snapshot/task API;
2. browser/editor reuse;
3. `@proofscript/lsp`;
4. npm-oriented `@proofscript/project`.

## H5. Library ecosystem
Publish checked module artifacts with npm packages for core/prelude, standard data structures, verified software libraries, and later theorem/math libraries.

Do not begin by porting all Lean.Meta, all Lean.Elab, Lake, or Lean's native runtime. Grow from the smallest useful semantic foundations.
