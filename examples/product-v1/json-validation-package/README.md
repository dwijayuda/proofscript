# @proofscript/json-validation

Bounded Product-v1 JSON **text** validation package.

This package is consumed through `proofscript.ffi/v1` with
`trust: "trusted-external"`. It intentionally exposes only primitive
`String` / `Bool` boundaries.

It does **not** claim:

- a verified JSON parser or serializer;
- a ProofScript JSON value model;
- correspondence between JSON numbers and ProofScript `Int`;
- verified JavaScript execution.

The normative bounded profile is
`config/proofscript-json-validation-v1.json`.
