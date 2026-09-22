export interface CoreLoweringDescriptor {
  readonly semanticId: string;
  readonly feature: string;
  readonly trust: "kernel-primitive" | "checked-core-library" | "checked-core-proposition";
  readonly status: "unified" | "partial";
  readonly notes: string;
}

export class CoreLoweringRegistry<E, C, T> {
  readonly #entries = new Map<string, { descriptor: CoreLoweringDescriptor; lower: (expr: E, context: C) => T }>();

  register(descriptor: CoreLoweringDescriptor, lower: (expr: E, context: C) => T): void {
    if (this.#entries.has(descriptor.semanticId)) throw new Error(`duplicate Core lowering '${descriptor.semanticId}'`);
    this.#entries.set(descriptor.semanticId, { descriptor, lower });
  }

  lower(semanticId: string, expr: E, context: C): T | undefined {
    return this.#entries.get(semanticId)?.lower(expr, context);
  }

  descriptors(): readonly CoreLoweringDescriptor[] {
    return [...this.#entries.values()].map(entry => entry.descriptor).sort((a, b) => a.semanticId.localeCompare(b.semanticId));
  }
}
