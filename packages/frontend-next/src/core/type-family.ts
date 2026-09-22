import { ProofScriptError } from "./errors.js";
import type { DeclaredTypeFamilyDescriptor, IRExpr, IRType, IRTypeArgument, TypeFamilyResolver } from "./model.js";
import { nominalType, substituteType, typeArgumentDisplay } from "./type-utils.js";

function substitutionsFor(
  params: DeclaredTypeFamilyDescriptor["params"],
  args: readonly IRTypeArgument[],
  count = args.length,
): { readonly types: Map<string, IRType>; readonly values: Map<string, IRExpr> } {
  const types = new Map<string, IRType>();
  const values = new Map<string, IRExpr>();
  for (let index = 0; index < Math.min(count, params.length, args.length); index += 1) {
    const param = params[index]!;
    const arg = args[index]!;
    if (param.isTypeParam && arg.kind === "type") types.set(param.name, arg.value);
    if (!param.isTypeParam && arg.kind === "term") values.set(param.name, arg.value);
  }
  return { types, values };
}

export function resolveDeclaredTypeFamily(
  descriptor: DeclaredTypeFamilyDescriptor,
  args: readonly IRTypeArgument[],
): IRType {
  if (args.length !== descriptor.params.length) {
    throw new ProofScriptError("PS2210", `Type family '${descriptor.name}' expects ${descriptor.params.length} argument(s), got ${args.length}.`);
  }
  descriptor.params.forEach((param, index) => {
    const arg = args[index]!;
    if (param.isTypeParam && arg.kind !== "type") {
      throw new ProofScriptError("PS2211", `Type family '${descriptor.name}' argument '${param.name}' must be a type.`);
    }
    if (!param.isTypeParam && arg.kind !== "term") {
      throw new ProofScriptError("PS2212", `Type family '${descriptor.name}' argument '${param.name}' must be a term.`);
    }
  });
  const rendered = args.map(typeArgumentDisplay).join(",");
  return nominalType(
    args.length === 0 ? descriptor.name : `${descriptor.name}(${args.map((arg) => `${arg.kind}:${typeArgumentDisplay(arg)}`).join(",")})`,
    args.length === 0 ? descriptor.name : `${descriptor.name}(${rendered})`,
    descriptor.family,
    args,
  );
}

export function declaredTypeFamilySpec(descriptor: DeclaredTypeFamilyDescriptor): TypeFamilyResolver {
  return {
    descriptor,
    params: descriptor.params.map((param, index) => param.isTypeParam
      ? ({ kind: "type" } as const)
      : ({
          kind: "term" as const,
          expectedType(prior: readonly IRTypeArgument[]) {
            const substitutions = substitutionsFor(descriptor.params, prior, index);
            return substituteType(param.type, substitutions.types, substitutions.values);
          },
        } as const)),
    resolve(args) { return resolveDeclaredTypeFamily(descriptor, args); },
  };
}
