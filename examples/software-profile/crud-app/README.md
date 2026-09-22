# ProofScript CRUD app example

This example is intentionally more app-like than the small smoke fixtures. It models a tiny in-memory task CRUD domain in the current Software Profile v0 subset:

- domain enums with `inductive`;
- immutable records with `structure`;
- create/read/update/delete operations as total functions;
- explicit validation with `Except(String, TaskStore)`;
- optional lookup with `Option(Task)`;
- collection processing with `List.map`, `List.filter`, `List.find?`, and `List.foldl`;
- small checked `by rfl` smoke theorems over the executable flow.

Build it from the repository after `npm run setup` and `npm link`:

```bash
cd examples/software-profile/crud-app
psc check
psc build
psc compile src --out-dir dist
npm run build:generated-js
npm start
```

The generated app imports `./proofscript-runtime.js` by default so NodeNext/ESM compilation keeps the runtime and main module side-by-side. Use `psc build --bundle-runtime` for a single self-contained TypeScript file.

Trust boundary: this is executable software-profile output, not a proof of full Lean 4 equivalence and not a backend execution-correspondence proof.


## Imperative TypeScript host demo

The pure CRUD domain lives in `src/Main.ps`. The optional host demo in
`host/imperative-demo.ts` shows ordinary TypeScript application glue calling the
generated ProofScript functions after `psc build`.

```bash
psc build
npm run build:generated-js
npm run build:host
npm run start:host

# or all together
npm run demo
```

The host output is JSON summarizing a create/update/delete flow performed through
the generated ProofScript module.
