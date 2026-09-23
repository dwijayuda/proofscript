# @proofscript/validation

Small checked validation combinators for Product-v1 ProofScript.

The package exposes module `ProofScript.Validation` and uses
`Except(String, A)` as the Result-like validation value.

It contains ordinary ProofScript source. When consumed through Product-v1 npm
package source resolution, its declarations travel through the same canonical
parser, elaborator, Core, and PSKernel path as application source.

This package does not parse JSON and does not introduce host exceptions or IO.
