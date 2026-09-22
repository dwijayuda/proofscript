# Proof Obligation: <ID>

- **ID:** `<stable-id>`
- **Status:** not-started | informal-spec | mirrored | lean-proof-target | proof-in-progress | proven | rejected | retired
- **Profile:** PSC-0 | PSC-1 | PSC-2 | PSC-Full
- **Layer:** kernel | parser | elaborator | backend | runtime | package | release
- **Source file:** `<path>`
- **Target file:** `<path>`
- **Related decision:** `<decision record path>`

## Claim

State the semantic claim precisely.

Example:

```text
For every supported PSC-1 Nat literal n, kernel normalization produces the same constructor meaning as repeated Nat.succ over Nat.zero.
```

## Scope

Included:

- ...

Excluded:

- ...

## Formal statement target

Sketch the formal theorem that should eventually exist.

```lean
-- theorem name and intended statement here
```

## Trusted assumptions

List assumptions:

- Node.js bigint behaves as assumed for runtime execution.
- Kernel prelude declarations were admitted through the trusted checker.
- Serialized artifacts passed schema validation.

## Implementation references

- `<file>:<symbol>`
- `<file>:<symbol>`

## Smoke evidence

Commands:

```bash
npm run test:kernel:smoke
```

Relevant fixtures:

```text
<fixture path>
```

## Proof plan

1. Define source semantics.
2. Define target implementation relation.
3. Prove preservation for supported constructors.
4. Prove unsupported cases reject or stay neutral.
5. Link theorem artifact.

## Current result

```text
not proven yet
```

## Notes

Add caveats and future work.
