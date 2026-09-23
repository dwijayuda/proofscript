# Product-v1 JSON validation example

This example consumes the local npm package `@proofscript/json-validation`
through `proofscript.ffi/v1`.

The boundary is deliberately text-level: only ProofScript `String` and
`Bool` values cross the FFI boundary. Host JSON objects, arrays, numbers,
`null`, and exceptions never cross into ProofScript.

This is a **trusted-external validation package**, not a verified JSON parser.
The certificate binds the exact FFI manifest and generated runtime artifact;
`endToEndVerifiedJavaScript` and verified-JSON claims remain false.
