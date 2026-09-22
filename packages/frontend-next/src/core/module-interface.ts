import { ProofScriptError } from "./errors.js";
import type {
  ProofScriptModuleInterface,
  SerializedProofScriptModuleInterface,
  SerializedSemanticInfoEntry,
} from "./model.js";
import { declaredTypeFamilySpec } from "./type-family.js";
import type { Registry } from "./registry.js";

function serializableValue(value: unknown, path: string): unknown {
  if (typeof value === "function") {
    throw new ProofScriptError("PS8010", `Module interface contains executable state at '${path}' and no semantic-interface codec handled it.`);
  }
  if (Array.isArray(value)) return value.map((item, index) => serializableValue(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) result[key] = serializableValue(item, `${path}.${key}`);
    return result;
  }
  return value;
}

function serializeSemanticInfo(
  iface: ProofScriptModuleInterface,
  registry: Registry | undefined,
): readonly SerializedSemanticInfoEntry[] {
  return iface.semanticInfo.map((item) => {
    const matches = registry?.findSemanticInterfaceCodecs(item.key, item.value) ?? [];
    if (matches.length > 1) {
      throw new ProofScriptError("PS8013", `Semantic metadata '${item.key}' matches multiple interface codecs: ${matches.map((match) => match.codec.id).join(", ")}.`);
    }
    const match = matches[0];
    if (!match) {
      return { key: item.key, encoding: "json", value: serializableValue(item.value, `semanticInfo:${item.key}`) } as const;
    }
    const payload = serializableValue(
      match.codec.serialize(item.key, item.value, { moduleInterface: iface }),
      `semanticInfo:${item.key}:codec:${match.codec.id}`,
    );
    match.codec.validate(item.key, payload);
    return {
      key: item.key,
      encoding: "codec",
      codec: {
        id: match.codec.id,
        version: match.codec.version,
        pluginId: match.pluginId,
        pluginVersion: match.pluginVersion,
      },
      payload,
    } as const;
  });
}

export function serializeModuleInterface(
  iface: ProofScriptModuleInterface,
  registry?: Registry,
): SerializedProofScriptModuleInterface {
  const typeFamilies = iface.typeFamilies.map(({ name, resolver }) => {
    if (!resolver.descriptor) {
      throw new ProofScriptError("PS8011", `Module-produced type family '${name}' has no declarative reconstruction descriptor.`);
    }
    return { name, descriptor: resolver.descriptor };
  });
  const result: SerializedProofScriptModuleInterface = {
    schema: "proofscript.module-interface/v2",
    module: iface.module,
    isModule: iface.isModule,
    functions: iface.functions,
    definitionBodies: iface.definitionBodies,
    types: iface.types,
    typeFamilies,
    classes: iface.classes,
    instances: iface.instances,
    namespaces: iface.namespaces,
    aliases: iface.aliases,
    semanticInfo: serializeSemanticInfo(iface, registry),
    ...(iface.declarationAttributes?.length ? { declarationAttributes: iface.declarationAttributes } : {}),
    access: iface.access,
    phaseAccess: iface.phaseAccess,
    origins: iface.origins,
  };
  return serializableValue(result, `module:${iface.module}`) as SerializedProofScriptModuleInterface;
}

function rehydrateSemanticInfo(
  entries: readonly SerializedSemanticInfoEntry[],
  registry?: Registry,
): ProofScriptModuleInterface["semanticInfo"] {
  return entries.map((item) => {
    if (item.encoding === "json") return { key: item.key, value: item.value };
    const registered = registry?.getSemanticInterfaceCodec(item.codec.id);
    if (!registered) {
      throw new ProofScriptError("PS8014", `Semantic interface codec '${item.codec.id}' required by '${item.key}' is not installed.`);
    }
    if (
      registered.codec.version !== item.codec.version ||
      registered.pluginId !== item.codec.pluginId ||
      registered.pluginVersion !== item.codec.pluginVersion
    ) {
      throw new ProofScriptError(
        "PS8015",
        `Semantic interface codec provenance mismatch for '${item.key}': cached ${item.codec.pluginId}@${item.codec.pluginVersion}/${item.codec.id}@${item.codec.version}, installed ${registered.pluginId}@${registered.pluginVersion}/${registered.codec.id}@${registered.codec.version}.`,
      );
    }
    registered.codec.validate(item.key, item.payload);
    return { key: item.key, value: registered.codec.rehydrate(item.key, item.payload) };
  });
}

export function rehydrateModuleInterface(
  serialized: SerializedProofScriptModuleInterface,
  registry?: Registry,
): ProofScriptModuleInterface {
  if (serialized.schema !== "proofscript.module-interface/v2") {
    throw new ProofScriptError("PS8012", `Unsupported module interface schema '${(serialized as { schema?: unknown }).schema ?? "<missing>"}'.`);
  }
  return {
    module: serialized.module,
    isModule: serialized.isModule,
    functions: serialized.functions,
    definitionBodies: serialized.definitionBodies,
    types: serialized.types,
    typeFamilies: serialized.typeFamilies.map(({ name, descriptor }) => ({ name, resolver: declaredTypeFamilySpec(descriptor) })),
    classes: serialized.classes,
    instances: serialized.instances,
    namespaces: serialized.namespaces,
    aliases: serialized.aliases,
    semanticInfo: rehydrateSemanticInfo(serialized.semanticInfo, registry),
    declarationAttributes: serialized.declarationAttributes ?? [],
    access: serialized.access,
    phaseAccess: serialized.phaseAccess,
    origins: serialized.origins,
  };
}
