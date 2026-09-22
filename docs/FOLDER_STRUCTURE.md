# Production folder and file structure

```text
proofscript/
├── specs/                         # normative reference copy + versioned derived contracts
│   ├── language/
│   ├── kernel/
│   ├── plugin-api/
│   └── artifacts/
├── packages/
│   ├── kernel/                    # TCB: logical checker; no ProofScript deps
│   ├── kernel-codec/              # bounded inert serialization validator
│   ├── verifier/                  # isolated psverify replay; no plugins
│   ├── certificates/              # artifact/statement binding
│   ├── syntax/                    # source syntax data
│   ├── parser/                    # command-by-command parser architecture
│   ├── elaborator/                # source -> explicit core
│   ├── frontend/                  # parser/elaborator/check orchestration
│   ├── environment/               # scaffold: full Lean-compatible environment
│   ├── macro/                     # scaffold: macros/quotation
│   ├── typeclass/                 # scaffold: instance synthesis
│   ├── recursion/                 # scaffold: pattern/termination elaboration
│   ├── tactics-core/              # scaffold: proof-state/tactic elaboration
│   ├── plugin-api/                # versioned API; no kernel hooks
│   ├── project/                   # project/config discovery
│   ├── plugin-host/               # npm plugin resolution/load
│   ├── semantic-ir/               # checked execution-facing snapshot
│   ├── compiler/                  # backend dispatch
│   ├── lean-export/               # optional interoperability artifact
│   ├── oracle-lean/               # optional pinned Lean 4.33.1 oracle
│   ├── std/                       # scaffold: standard library
│   ├── formatter/                 # scaffold
│   ├── diagnostics/               # scaffold
│   ├── lsp/                       # scaffold
│   └── cli/                       # published `proofscript` npm package / `psc`
├── plugins/
│   ├── official/
│   │   ├── backend-manifest/      # working reference plugin
│   │   ├── backend-js/            # scaffold
│   │   ├── backend-wasm/          # scaffold
│   │   ├── backend-rust/          # scaffold
│   │   └── contracts/             # scaffold
│   └── examples/
│       └── backend-names/         # working third-party-style plugin
├── tests/
│   ├── conformance/
│   ├── differential/
│   ├── security/
│   └── fuzz/
├── tools/
│   ├── check-boundaries.ts
│   ├── conformance-runner.ts
│   ├── test-runner.ts
│   └── doctor.ts
└── .github/workflows/ci.yml
```

The source tree is intentionally larger than the implemented language slice. Scaffold-only packages are named now so dependencies can grow in the intended direction without collapsing everything into a single compiler package.
