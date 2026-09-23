# ProofScript for Visual Studio Code

VS Code integration backed by the real ProofScript compiler and proof checker.

## Default experience

The editor intentionally follows Lean's restrained interaction model:

- `.ps` syntax and semantic highlighting;
- compiler/proof diagnostics;
- hover, completion, definition, outline, signature help and `Ctrl+.` quick fixes;
- Lean-style **ProofScript Infoview** in the right Secondary Side Bar;
- Expected type, Goals / `Goals accomplished!`, cursor-local Messages and All Messages;
- Lean-like double blue checkmark gutter marker for a successfully checked theorem;
- red × gutter marker only for rejected theorem/proof declarations;
- yellow gutter marker for relevant warnings and advisory lint findings;
- persistent bottom-left **ProofScript** status item while a `.ps` editor is active;
- bundled self-contained ProofScript LSP.

`Goals accomplished!` is shown in green. Compiler profile names, Core-format versions and migration internals are hidden under **Details** instead of occupying the normal proof-development UI.

## Diagnostics

The default message style is mathematical and actionable. For example a failed reflexivity proof is presented as:

```text
Not a definitional equality: the left-hand side
  lhs
is not definitionally equal to the right-hand side
  rhs

Type mismatch
  rfl
has type
  lhs = lhs
but is expected to have type
  lhs = rhs

Hint: If the equality is intended, prove the missing equality step with
rewriting or a lemma; otherwise correct the theorem statement.
```

The lower-level checker message remains available under **Details** for compiler debugging and academic investigation.

## Linting

Lint findings are ordinary yellow warnings. They are advisory and cannot turn an invalid proof into a valid one or vice versa. `psc lint` exposes the same findings on the command line.

## Commands

- `ProofScript: Show Infoview`
- `ProofScript: Restart Language Server`
- `ProofScript: Show Server Information`
- `ProofScript: Run Doctor`
- `ProofScript: Show Document Status`
- `ProofScript: Copy Expected Type`
- `ProofScript: Copy Current Goal`
- `ProofScript: Copy Proof State`
- `ProofScript: Show Output`
- `ProofScript: Lint Current File`

Clicking the bottom-left ProofScript status item opens the Infoview. Document-status notifications are remembered per open file so switching between ProofScript editors immediately restores the last known status.

## Proof-state boundary

The current editor proof state is declaration-level. Cursor-sensitive tactic states will use real elaborator snapshots once the compiler exposes them; VS Code never fabricates tactic states.


## Protocol compatibility

The dogfood extension pins the expected ProofScript LSP protocol. If `proofscript.lsp.path` points at an older or newer server, startup fails with a protocol-mismatch message instead of silently running with incompatible editor metadata. Use `ProofScript: Run Doctor` to print extension version, server protocol, core profile, worker counters, and editor cache stats to the ProofScript output channel.
