# @proofscript/oracle-lean

Optional exact Lean 4.33.1 oracle. It is not needed for ordinary standalone ProofScript checking or strict kernel replay.

The oracle parses `lean --version` and requires semantic version equality with `4.33.1`; near versions are reported as `unsupported` rather than silently substituted.

By default the plugin runs `lean` from `PATH`. A reproducible caller may provide an explicit binary through the plugin option used by the CLI:

```bash
psc verify artifact.pscore.json --oracle lean --lean /absolute/path/to/lean --json
```

or through `PROOFSCRIPT_LEAN_BIN` when invoking the differential tooling.
