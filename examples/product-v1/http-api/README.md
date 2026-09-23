# Product-v1 HTTP/API example

The ProofScript module owns pure response-domain logic:

- response status selection;
- response body selection.

The Node host owns HTTP transport, sockets, request parsing, and conversion of
the checked `Nat` status from `bigint` to Node's numeric status-code API.

This is deliberate: Product-v1 ffi-v1 does not claim callback/async/IO
verification. The representative gate therefore demonstrates a truthful host
adapter around checked ProofScript domain logic rather than pretending the Node
HTTP server is verified.
