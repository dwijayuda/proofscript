# ProofScript Product-v1 npm FFI example

This example keeps the trust boundary explicit:

- `Main.ps` declares `hostUpper` as an `axiom`, so Core records an assumption.
- `proofscript.ffi.json` binds that assumption to a named npm export for execution.
- the host package remains `trusted-external`; its implementation is not proved by ProofScript.
- `result` is executable only when the FFI manifest is supplied.

The Product-v1 FFI gate copies this example to a temporary directory, installs the
local file dependency offline, builds JavaScript, executes `result`, and checks
the certificate manifest binding.
