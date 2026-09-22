# @proofscript/compiler

Canonical high-level programmatic entry point for the ProofScript toolchain.

## Current API

- `checkSource(source, options)` — check one already-loaded source unit through the canonical frontend and PSKernel path.
- `checkProjectFile(entryFile, options)` — resolve/check a ProofScript project/module closure through the canonical frontend and PSKernel path.
- `runBackend(backend, summary, sourcePath, outPath)` — dispatch a checked semantic snapshot to a backend.

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
