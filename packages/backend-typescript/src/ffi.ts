import type { CoreDeclaration, Term } from "@proofscript/kernel";
import { containsConstName, flattenPi } from "./termEmitter";
import type { EmitContext, FfiBinding, ResolvedFfiBinding } from "./types";

const RUNTIME_FFI_TYPES = new Set(["Nat", "Int", "Bool", "String", "Unit"]);
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;

function runtimeTypeName(term: Term): string | null {
  if (term.tag !== "const") return null;
  return RUNTIME_FFI_TYPES.has(term.name) ? term.name : null;
}

export function resolveFfiBindings(
  declarations: readonly CoreDeclaration[],
  ctx: EmitContext,
  bindings: readonly FfiBinding[] = [],
): readonly ResolvedFfiBinding[] {
  const axioms = new Map(
    declarations
      .filter((decl): decl is Extract<CoreDeclaration, { kind: "axiom" }> => decl.kind === "axiom")
      .map((decl) => [decl.name, decl] as const),
  );
  const seen = new Set<string>();
  const resolved: ResolvedFfiBinding[] = [];

  for (const binding of bindings) {
    if (seen.has(binding.name)) throw new Error(`duplicate FFI binding for '${binding.name}'`);
    seen.add(binding.name);
    if (binding.trust !== "trusted-external") {
      throw new Error(`FFI binding '${binding.name}' must declare trust='trusted-external'`);
    }
    if (typeof binding.module !== "string" || binding.module.length === 0 || /[\r\n\0]/u.test(binding.module)) {
      throw new Error(`FFI binding '${binding.name}' has an invalid module specifier`);
    }
    if (!IDENTIFIER.test(binding.exportName)) {
      throw new Error(`FFI binding '${binding.name}' requires a named JavaScript export identifier`);
    }
    const declaration = axioms.get(binding.name);
    if (!declaration) {
      throw new Error(`FFI binding '${binding.name}' must target a user Core axiom`);
    }
    if (declaration.levelParams?.length) {
      throw new Error(`FFI binding '${binding.name}' cannot be universe-polymorphic in ffi-v1`);
    }
    const shape = flattenPi(declaration.type);
    if (shape.domains.length === 0) {
      throw new Error(`FFI binding '${binding.name}' must be a function in ffi-v1`);
    }
    const params = shape.domains.map(runtimeTypeName);
    const result = runtimeTypeName(shape.codomain);
    if (params.some((type) => type === null) || result === null) {
      throw new Error(
        `FFI binding '${binding.name}' must use only first-order Nat/Int/Bool/String/Unit parameter and result types`,
      );
    }
    const jsName = ctx.nameMap.get(binding.name);
    if (!jsName) throw new Error(`internal FFI error: missing emitted name for '${binding.name}'`);
    resolved.push({
      name: binding.name,
      jsName,
      module: binding.module,
      exportName: binding.exportName,
      trust: binding.trust,
      arity: shape.domains.length,
      parameters: params as string[],
      result,
    });
  }

  const bound = new Set(resolved.map((binding) => binding.name));
  for (const declaration of declarations) {
    if ((declaration.kind !== "definition" && declaration.kind !== "opaque") || !declaration.value) continue;
    for (const axiom of axioms.values()) {
      if (containsConstName(declaration.value, axiom.name) && !bound.has(axiom.name)) {
        throw new Error(
          `executable declaration '${declaration.name}' depends on unbound axiom '${axiom.name}'; provide an explicit ffi-v1 binding`,
        );
      }
    }
  }

  return resolved;
}

function typeScriptRuntimeType(typeName: string): string {
  switch (typeName) {
    case "Nat":
    case "Int":
      return "bigint";
    case "Bool":
      return "boolean";
    case "String":
      return "string";
    case "Unit":
      return "null";
    default:
      throw new Error(`unsupported ffi-v1 runtime type '${typeName}'`);
  }
}

function curriedFfiExpression(
  binding: ResolvedFfiBinding,
  rawName: string,
  target: "js" | "ts",
): string {
  const args = binding.parameters.map((_, index) => `arg${index}`);
  let body = `${rawName}(${args.join(", ")})`;
  for (let index = args.length - 1; index >= 0; index--) {
    const arg = args[index]!;
    const param = target === "ts"
      ? `(${arg}: ${typeScriptRuntimeType(binding.parameters[index]!)})`
      : arg;
    body = `${param} => ${body}`;
  }
  return body;
}

export function emitJavaScriptFfiPrelude(bindings: readonly ResolvedFfiBinding[]): readonly string[] {
  const lines: string[] = [];
  bindings.forEach((binding, index) => {
    const moduleName = `__psFfiModule${index}`;
    const rawName = `__psFfiRaw${index}`;
    lines.push(`const ${moduleName} = require(${JSON.stringify(binding.module)});`);
    lines.push(`const ${rawName} = ${moduleName}[${JSON.stringify(binding.exportName)}];`);
    lines.push(
      `if (typeof ${rawName} !== "function") throw new TypeError(${JSON.stringify(
        `ProofScript FFI binding '${binding.name}' expected function export '${binding.exportName}' from '${binding.module}'`,
      )});`,
    );
    lines.push(`const ${binding.jsName} = ${curriedFfiExpression(binding, rawName, "js")};`);
  });
  return lines;
}

export function emitTypeScriptFfiPrelude(bindings: readonly ResolvedFfiBinding[]): readonly string[] {
  const lines: string[] = [];
  bindings.forEach((binding, index) => {
    const rawName = `__psFfiRaw${index}`;
    lines.push(
      `import { ${binding.exportName} as ${rawName} } from ${JSON.stringify(binding.module)};`,
    );
    lines.push(
      `const ${binding.jsName} = ${curriedFfiExpression(binding, rawName, "ts")};`,
    );
  });
  return lines;
}
