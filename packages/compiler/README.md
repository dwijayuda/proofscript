# @proofscript/compiler

Canonical high-level programmatic entry point for the ProofScript toolchain.

## Current API

- `checkSource(source, options)` — check one already-loaded source unit through the canonical frontend and PSKernel path.
- `checkProjectFile(entryFile, options)` — resolve/check a ProofScript project/module closure through the canonical frontend and PSKernel path.
- `runBackend(backend, summary, sourcePath, outPath)` — dispatch a checked semantic snapshot to a backend.
- `createCheckedProjectSnapshot(project)` — derive deterministic module/project hashes from canonical checked Core results.
- `checkProjectSnapshot(entryFile, options)` — check a project and return both the canonical result and its deterministic checked snapshot.

The package intentionally delegates language semantics to the existing frontend/kernel implementation. It is a facade, not a second parser, elaborator, or checker.

## Dependency direction

```text
parser / elaborator / project / environment
                ↓
             frontend
                ↓
             compiler
             ↙      ↘
           CLI   language-service (planned)
                         ↓
                        LSP
```

Consumers should prefer this package over directly composing parser/elaborator/kernel internals.

Backend success does **not** automatically establish execution correspondence with the checked ProofScript program. Runtime correspondence remains a separately specified/tested/proved claim.


## Incremental identity

PS1 introduces `proofscript.checked-project/v1` as a conservative incremental identity.

Each module snapshot records:

- module name;
- source hash;
- imports;
- checked declaration names;
- a deterministic hash of checked Core declarations + typeclass metadata.

The current `dependencyInterfaceSha256` intentionally equals the full checked semantic hash. This can over-invalidate dependents when only a private/body detail changes, but it cannot incorrectly reuse a dependency based on an incomplete public-interface model.

Future work may replace this conservative dependency hash with precise public/private interface hashes after that model is derived from canonical checked compiler results.
