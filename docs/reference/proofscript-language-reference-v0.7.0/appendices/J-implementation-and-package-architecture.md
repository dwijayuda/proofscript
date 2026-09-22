# Appendix J — Implementation and package architecture

This appendix is normative for trust/package classification, not source syntax.

## J1. Dependency direction

```text
@proofscript/syntax
      ↓
@proofscript/meta
      ↓
@proofscript/elab
      ↓
    pskernel
      ↓
checked Environment
```

Portable distribution branches through `@proofscript/module`.

Executable compilation branches through:

```text
checked declarations
  -> @proofscript/compiler-ir
  -> @proofscript/backend-ts
  -> @proofscript/runtime
```

Incremental tooling consumes syntax/meta/elab/module through `@proofscript/language`; `@proofscript/lsp` is a protocol adapter.

## J2. Trust classes

- **TCB:** pskernel checking/admission semantics.
- **Untrusted support:** parser, elaborator, tactics, module transport, CLI, browser, compiler backend, runtime host, language service, LSP, project tooling.
- **Test-only:** conformance/differential/oracle orchestration.

An outer-layer bug MUST NOT make a declaration trusted without kernel admission.

Final Lean 4.34 removed the deprecated in-kernel compiler-interpreter reduction hook. ProofScript therefore does not include a `NativeEvaluator` kernel extension in the Lean-4.34-compatible architecture. Native proof tactics or compiler execution live in outer meta/compiler layers with separately declared trust assumptions.

## J3. TypeScript-first package policy

JavaScript-ecosystem implementation packages SHOULD:
- author source in TypeScript;
- enable strict TypeScript checks;
- emit ESM JavaScript into build output;
- avoid parallel hand-authored `.mjs` implementations unless explicitly justified.

## J4. Lean independence

A supported standalone ProofScript profile may run without Lean installed for end users. Lean remains the pinned semantic/reference oracle used to establish and maintain compatibility.
