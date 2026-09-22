import { ProofScriptError } from "../../core/errors.js";
import type { ClassDescriptor, IRExpr, IRParam, IRType, StructureDescriptor } from "../../core/model.js";
import { makeSortType, makeTypeTerm, reduceTypeValuedExpr, substituteType, typeVariableName } from "../../core/type-utils.js";
import type { ProofScriptPlugin } from "../../core/plugin-api.js";

interface StructureConstructPayload {
  readonly structureName: string;
  readonly fieldNames: readonly string[];
}
interface StructureUpdatePayload {
  readonly structureName: string;
  readonly fieldPaths: readonly (readonly string[])[];
}
interface StructureProjectPayload {
  readonly structureName: string;
  readonly fieldName: string;
}
interface StructureParentProjectPayload {
  readonly structureName: string;
  readonly parentName: string;
}
interface ClassProjectPayload {
  readonly className: string;
  readonly fieldName: string;
  readonly methodParamCount?: number;
}
interface InstancePayload {
  readonly name: string;
  readonly sourceName: string;
  readonly params: readonly IRParam[];
  readonly targetType: IRType;
  readonly fields: readonly { readonly name: string; readonly value: IRExpr }[];
}

function typeParams(params: readonly IRParam[]): readonly IRParam[] {
  return params.filter((param) => param.isTypeParam);
}

function runtimeParams(params: readonly IRParam[]): readonly IRParam[] {
  return params.filter((param) => !param.isTypeParam && !param.isProofParam && !param.runtimeErased);
}

function genericDecl(params: readonly IRParam[]): string {
  const generics = typeParams(params);
  return generics.length ? `<${generics.map((param) => param.name).join(", ")}>` : "";
}

function retainedTypeArgs(type: IRType, context: import("../../core/model.js").TypeEmitContext): string {
  const args = (type.args ?? []).filter((arg) => arg.kind === "type").map((arg) => context.emitTypeArgument(arg));
  return args.length ? `<${args.join(", ")}>` : "";
}

function emitStructureTypeName(type: IRType, context: import("../../core/model.js").TypeEmitContext): string {
  const name = type.family?.startsWith("lean.structure:") ? type.family.slice("lean.structure:".length) : type.displayName.split("(")[0]!;
  return `${name}${retainedTypeArgs(type, context)}`;
}

function emitClassTypeName(type: IRType, context: import("../../core/model.js").TypeEmitContext): string {
  const name = type.family?.startsWith("lean.class:") ? type.family.slice("lean.class:".length) : type.displayName.split("(")[0]!;
  if (name === "CoeFun") {
    const sourceArg = type.args?.[0];
    const gammaArg = type.args?.[1];
    if (sourceArg?.kind !== "type" || gammaArg?.kind !== "term") throw new ProofScriptError("PS3825", "Malformed CoeFun type for TypeScript lowering.");
    const dummy: IRExpr = { kind: "var", name: "__ps_coefun_value", type: sourceArg.value };
    const applied: IRExpr = { kind: "apply", callee: gammaArg.value, args: [dummy], type: makeSortType("Type") };
    const target = reduceTypeValuedExpr(applied);
    if (!target || target.form !== "pi") throw new ProofScriptError("PS3826", "TypeScript CoeFun lowering currently requires a statically reducible function-family result.");
    return `CoeFun<${context.emitType(sourceArg.value)}, ${context.emitType(target)}>`;
  }
  if (name === "CoeSort") throw new ProofScriptError("PS3827", "TypeScript does not represent CoeSort dictionaries because they compute types from runtime values.");
  return `${name}${retainedTypeArgs(type, context)}`;
}

function emitFieldsObject(fieldNames: readonly string[], self: string): string {
  return `{ ${fieldNames.map((name) => `${name}: ${self}.${name}`).join(", ")} }`;
}

interface UpdateEntry { readonly path: readonly string[]; readonly value: string }
function renderNestedUpdate(base: string, entries: readonly UpdateEntry[]): string {
  const direct = new Map<string, string>();
  const nested = new Map<string, UpdateEntry[]>();
  for (const entry of entries) {
    const [head, ...tail] = entry.path;
    if (!head) continue;
    if (tail.length === 0) direct.set(head, entry.value);
    else {
      const group = nested.get(head) ?? [];
      group.push({ path: tail, value: entry.value });
      nested.set(head, group);
    }
  }
  const fields: string[] = [];
  for (const [name, value] of direct) fields.push(`${name}: ${value}`);
  for (const [name, group] of nested) {
    if (direct.has(name)) throw new ProofScriptError("PS3820", `TypeScript structure update cannot simultaneously replace '${name}' and update a nested field beneath it.`);
    fields.push(`${name}: ${renderNestedUpdate(`${base}.${name}`, group)}`);
  }
  return `({ ...${base}${fields.length ? `, ${fields.join(", ")}` : ""} })`;
}

function emitClassFieldType(type: IRType, context: import("../../core/model.js").TypeEmitContext): string {
  // Preserve the existing fail-closed runtime correspondence check first.
  // In particular, genuinely dependent Pi types (e.g. (n : Nat) -> Fin n)
  // remain unsupported by TypeScript.  Only after the canonical emitter has
  // accepted the type do we flatten its nondependent method parameter spine.
  const validated = context.emitType(type);
  const params: { name: string; type: IRType }[] = [];
  let current = type;
  while (current.form === "pi" && current.domain && current.codomain && current.binder) {
    params.push({ name: current.binder.name === "_" ? `arg${params.length + 1}` : current.binder.name, type: current.domain });
    current = current.codomain;
  }
  if (!params.length) return validated;
  return `(${params.map((p) => `${p.name}: ${context.emitType(p.type)}`).join(", ")}) => ${context.emitType(current)}`;
}

function classParentTypes(descriptor: ClassDescriptor): readonly IRType[] {
  return descriptor.parentTypes ?? (descriptor.parentType ? [descriptor.parentType] : []);
}

const plugin: ProofScriptPlugin = {
  id: "proofscript.backend-feature.typescript-structure-class",
  version: "0.91.0",
  kind: "backend-feature",
  requires: ["proofscript.backend.typescript", "proofscript.feature.structure", "proofscript.feature.typeclass"],
  setup(registry) {
    registry.addTargetCapability("typescript", "lean.structure");
    registry.addTargetCapability("typescript", "lean.typeclass");
    registry.registerSemanticInfo("typescript.typeclassPrelude", `export interface BEq<A> { beq: (left: A, right: A) => boolean; }`);

    registry.registerTargetTypeFamilyLowering("typescript", "lean.structure", (type, context) => emitStructureTypeName(type, context));
    registry.registerTargetTypeFamilyLowering("typescript", "lean.class", (type, context) => emitClassTypeName(type, context));

    registry.registerTargetDeclarationLowering("typescript", "lean.structure.decl", (declaration, context) => {
      const descriptor = declaration.payload as StructureDescriptor;
      const generics = genericDecl(descriptor.params);
      const fields = descriptor.fields.map((field) => `  ${field.name}: ${emitClassFieldType(field.type, context)};`).join("\n");
      // Flatten Lean inheritance deliberately: this is a structural runtime
      // representation, not JavaScript prototype/class inheritance.
      return `export interface ${descriptor.name}${generics} {${fields ? `\n${fields}\n` : ""}}`;
    });

    registry.registerTargetExprLowering("typescript", "lean.structure.construct", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3810", "Expected structure construction operation.");
      const payload = expr.payload as StructureConstructPayload;
      const offset = Math.max(0, expr.args.length - payload.fieldNames.length);
      const fields = payload.fieldNames.map((name, index) => `${name}: ${context.emitExpr(expr.args[index + offset]!)}`).join(", ");
      return `({ ${fields} } as ${context.emitType(expr.type)})`;
    });

    registry.registerTargetExprLowering("typescript", "lean.structure.project", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3811", "Expected structure projection operation.");
      const payload = expr.payload as StructureProjectPayload;
      const self = expr.args.at(-1);
      if (!self) throw new ProofScriptError("PS3812", "Malformed structure projection: missing self argument.");
      return `${context.emitExpr(self)}.${payload.fieldName}`;
    });

    registry.registerTargetExprLowering("typescript", "lean.structure.parentProject", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3813", "Expected structure parent projection operation.");
      const payload = expr.payload as StructureParentProjectPayload;
      const self = expr.args.at(-1);
      if (!self) throw new ProofScriptError("PS3814", "Malformed structure parent projection: missing self argument.");
      const parent = context.registry.getSemanticInfo<StructureDescriptor>(`structure.decl:${payload.parentName}`);
      if (!parent) throw new ProofScriptError("PS3815", `Missing parent structure metadata for '${payload.parentName}'.`);
      const selfCode = context.emitExpr(self);
      return `(${emitFieldsObject(parent.fields.map((field) => field.name), selfCode)} as ${context.emitType(expr.type)})`;
    });

    registry.registerTargetExprLowering("typescript", "lean.structure.update", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3816", "Expected structure update operation.");
      const payload = expr.payload as StructureUpdatePayload;
      const base = expr.args[0];
      if (!base) throw new ProofScriptError("PS3817", "Malformed structure update: missing base value.");
      const entries: UpdateEntry[] = payload.fieldPaths.map((path, index) => ({ path, value: context.emitExpr(expr.args[index + 1]!) }));
      return `((_psu: ${context.emitType(base.type)}) => ${renderNestedUpdate("_psu", entries)})(${context.emitExpr(base)})`;
    });

    registry.registerTargetDeclarationLowering("typescript", "lean.class.decl", (declaration, context) => {
      const descriptor = declaration.payload as ClassDescriptor;
      const generics = genericDecl(descriptor.params);
      const fields = descriptor.fields.map((field) => `  ${field.name}: ${emitClassFieldType(field.type, context)};`).join("\n");
      const lines = [`export interface ${descriptor.name}${generics} {${fields ? `\n${fields}\n` : ""}}`];
      const parents = classParentTypes(descriptor);
      if (parents.length) {
        lines.push(`export namespace ${descriptor.name} {`);
        for (const parentType of parents) {
          const parentName = parentType.family!.slice("lean.class:".length);
          const parent = context.registry.getSemanticInfo<ClassDescriptor>(`class.decl:${parentName}`);
          if (!parent) throw new ProofScriptError("PS3821", `Missing parent class metadata for '${parentName}'.`);
          const functionGenerics = genericDecl(descriptor.params);
          const childArgs = typeParams(descriptor.params).length ? `<${typeParams(descriptor.params).map((param) => param.name).join(", ")}>` : "";
          const helper = `to${parentName.split(".").at(-1)!}`;
          lines.push(`  export function ${helper}${functionGenerics}(self: ${descriptor.name}${childArgs}): ${context.emitType(parentType)} {`);
          lines.push(`    return ${emitFieldsObject(parent.fields.map((field) => field.name), "self")};`);
          lines.push("  }");
        }
        lines.push("}");
      }
      return lines.join("\n");
    });

    registry.registerTargetExprLowering("typescript", "lean.derived.instance", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3828", "Expected derived-instance evidence operation.");
      const payload = expr.payload as { handler: string; subject: IRType; requirements?: readonly IRType[] };
      if (payload.handler !== "BEq") throw new ProofScriptError("PS3829", `TypeScript deriving handler '${payload.handler}' is not implemented.`);
      const subject = payload.subject;
      const runtimeEvidence = expr.args.filter((arg) => arg.kind !== "type");
      const requirements = payload.requirements ?? [];
      const comparatorFor = (type: IRType, left: string, right: string, _parameterNames: readonly string[]): string => {
        if (["Nat", "Bool", "String"].includes(type.id)) return `${left} === ${right}`;
        const index = requirements.findIndex((requirement) => requirement.id === type.id);
        const evidence = index >= 0 ? runtimeEvidence[index] : undefined;
        if (evidence) return `${context.emitExpr(evidence)}.beq(${left}, ${right})`;
        const variable = typeVariableName(type);
        if (variable) throw new ProofScriptError("PS3838", `TypeScript derived BEq is missing prerequisite BEq evidence for type parameter '${variable}'.`);
        throw new ProofScriptError("PS3836", `TypeScript derived BEq cannot yet prove '${type.displayName}' has faithful runtime equality.`);
      };

      if (subject.family?.startsWith("core.adt:")) {
        const name = subject.family.slice("core.adt:".length);
        const adt = context.registry.getSemanticInfo<any>(`adt.decl:${name}`);
        if (!adt) throw new ProofScriptError("PS3833", `Missing ADT metadata for derived BEq '${name}'.`);
        const typeParams = (adt.params ?? []).filter((param: IRParam) => param.isTypeParam);
        const parameterNames = typeParams.map((param: IRParam) => param.name);
        const branches = adt.variants.map((variant: any) => {
          const fields = (variant.params as readonly IRParam[]).filter((param) => !param.isTypeParam && param.binderInfo === "explicit");
          const checks = fields.map((field) => comparatorFor(field.type, `left.${field.name}`, `right.${field.name}`, parameterNames)).join(" && ") || "true";
          return `left.tag === "${variant.name}" && right.tag === "${variant.name}" ? (${checks}) : `;
        }).join("");
        return `({ beq: (left: ${context.emitType(subject)}, right: ${context.emitType(subject)}) => left.tag !== right.tag ? false : (${branches}false) })`;
      }
      if (subject.family?.startsWith("lean.structure:")) {
        const name = subject.family.slice("lean.structure:".length);
        const descriptor = context.registry.getSemanticInfo<StructureDescriptor>(`structure.decl:${name}`);
        if (!descriptor) throw new ProofScriptError("PS3835", `Missing structure metadata for derived BEq '${name}'.`);
        const typeParams = descriptor.params.filter((param) => param.isTypeParam);
        const parameterNames = typeParams.map((param) => param.name);
        const checks = descriptor.fields.map((field) => comparatorFor(field.type, `left.${field.name}`, `right.${field.name}`, parameterNames)).join(" && ") || "true";
        return `({ beq: (left: ${context.emitType(subject)}, right: ${context.emitType(subject)}) => ${checks} })`;
      }
      throw new ProofScriptError("PS3837", `TypeScript derived BEq has no runtime representation rule for '${subject.displayName}'.`);
    });

    registry.registerTargetExprLowering("typescript", "lean.class.project", (expr, context) => {
      if (expr.kind !== "op") throw new ProofScriptError("PS3822", "Expected class projection operation.");
      const payload = expr.payload as ClassProjectPayload;
      const methodCount = payload.methodParamCount ?? 0;
      const selfIndex = Math.max(0, expr.args.length - methodCount - 1);
      const self = expr.args[selfIndex];
      if (!self) throw new ProofScriptError("PS3823", "Malformed class projection: missing instance dictionary.");
      const methodArgs = expr.args.slice(selfIndex + 1).map((arg) => context.emitExpr(arg));
      return methodArgs.length ? `${context.emitExpr(self)}.${payload.fieldName}(${methodArgs.join(", ")})` : `${context.emitExpr(self)}.${payload.fieldName}`;
    });

    registry.registerTargetDeclarationLowering("typescript", "lean.instance.decl", (declaration, context) => {
      const payload = declaration.payload as InstancePayload;
      const generics = genericDecl(payload.params);
      const params = runtimeParams(payload.params);
      // Instance implicit/strict-implicit runtime binders have already been
      // resolved by ProofScript elaboration at every evidence use. Emit them as
      // ordinary positional TypeScript parameters, just like instance-dictionary
      // binders. Proof/proof-erased parameters were removed by runtimeParams().
      const paramList = params.map((param) => `${param.name}: ${context.emitType(param.type)}`).join(", ");
      const object = `{ ${payload.fields.map((field) => `${field.name}: ${context.emitExpr(field.value)}`).join(", ")} }`;
      const target = context.emitType(payload.targetType);
      if (payload.params.length === 0) return `export const ${payload.name}: ${target} = ${object};`;
      return `export function ${payload.name}${generics}(${paramList}): ${target} { return ${object}; }`;
    });
  },
};

export default plugin;
