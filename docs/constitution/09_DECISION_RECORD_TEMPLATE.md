# Decision Record: <Title>

- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | rejected | superseded
- **Decision class:** constitutional | architecture | implementation | experimental
- **Affected profile:** PSC-0 | PSC-1 | PSC-2 | PSC-Full
- **Affected packages:** `<package list>`
- **Trust-boundary impact:** none | low | medium | high

## Context

Describe the problem, current behavior, and why a decision is needed.

## Decision

State the decision clearly.

```text
We will ...
```

## Alternatives considered

### Alternative A

Pros:

- ...

Cons:

- ...

### Alternative B

Pros:

- ...

Cons:

- ...

## Rationale

Explain why the selected decision is best for ProofScript.

## Compatibility impact

State whether this changes:

- source syntax;
- elaboration;
- kernel acceptance;
- backend output;
- package API;
- certificate/artifact format.

## Trust-boundary impact

State whether this changes what the project trusts.

## Proof obligations

Add or update obligations:

```text
Obligation ID:
Claim:
Status:
```

## Tests / smoke evidence

List commands to run:

```bash
npm run build -- --pretty false
npm run test:kernel:smoke
```

## Migration plan

Describe exact migration steps.

## Rollback plan

Describe how to undo this decision safely.

## Follow-up tasks

- [ ] ...
