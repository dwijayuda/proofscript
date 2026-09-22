import { ConstantInfo, CoreDeclaration, RecursorKnownDefinition, declarationToConstantInfo } from "../Declaration";
import { KernelDeclarationError } from "../KernelError";
import { Name } from "../Name";
import { getAppFn, Term } from "../Expr";
import { LevelZero, levelDefEqList } from "../Level";

export type EnvironmentDeclaration =
  | CoreDeclaration
  | { kind: "constructor"; name: Name; levelParams: Name[]; type: Term; inductive: Name }
  | { kind: "recursor"; name: Name; levelParams: Name[]; type?: Term; metadata: { rules: { ctor: Name; nfields: number; recursiveFields: boolean[] }[]; numParams?: number; numIndices?: number; [key: string]: unknown } }
  | { kind: "quotient"; name: Name; levelParams: Name[]; type?: Term; quotKind?: string };

export interface CheckedDeclaration {
  declaration: EnvironmentDeclaration;
  assumptions: Set<Name>;
  generated: Name[];
}


function constructorDomains(type: Term): Term[] {
  const domains: Term[] = [];
  let cursor = type;
  while (cursor.tag === "pi") {
    domains.push(cursor.domain);
    cursor = cursor.body;
  }
  return domains;
}

function termContainsFamily(term: Term, families: ReadonlySet<Name>): boolean {
  switch (term.tag) {
    case "sort":
    case "bvar":
    case "lit": return false;
    case "const": return families.has(term.name);
    case "app": return termContainsFamily(term.fn, families) || termContainsFamily(term.arg, families);
    case "lam":
    case "pi": return termContainsFamily(term.domain, families) || termContainsFamily(term.body, families);
    case "let": return termContainsFamily(term.type, families) || termContainsFamily(term.value, families) || termContainsFamily(term.body, families);
    case "proj": return termContainsFamily(term.expr, families);
  }
}

function recursorRulesForConstructors(constructors: readonly { name: Name; type: Term }[], familyNames: readonly Name[], numParams = 0) {
  const families = new Set(familyNames);
  return constructors.map(c => {
    const domains = constructorDomains(c.type).slice(numParams);
    return {
      ctor: c.name,
      nfields: domains.length,
      recursiveFields: domains.map(domain => {
        const head = getAppFn(domain);
        return (head.tag === "const" && families.has(head.name)) || termContainsFamily(domain, families);
      }),
    };
  });
}

function propositionFamilyArity(type: Term | undefined): number | undefined {
  if (!type) return undefined;
  let cursor = type;
  let arity = 0;
  while (cursor.tag === "pi") {
    arity++;
    cursor = cursor.body;
  }
  return cursor.tag === "sort" && levelDefEqList([cursor.level], [LevelZero]) ? arity : undefined;
}

export class EnvironmentCore {
  private constants = new Map<Name, ConstantInfo>();
  private checked = new Map<Name, CheckedDeclaration>();
  #mutationRevision = 0n;
  /** Tracks mutations through this environment's supported methods. Stored
   * checked declarations must not be mutated through returned references. */
  get cacheRevision(): string { return this.#mutationRevision.toString(); }

  has(name: Name): boolean { return this.constants.has(name) || this.checked.has(name); }
  find(name: Name): CheckedDeclaration | undefined { return this.checked.get(name); }
  get(name: Name): CheckedDeclaration | undefined { return this.checked.get(name); }
  all(): CheckedDeclaration[] { return [...this.checked.values()]; }
  names(): Name[] { return [...this.checked.keys()]; }
  checkedDeclarations(): CheckedDeclaration[] { return this.all(); }
  constantInfos(): ConstantInfo[] { return [...this.constants.values()]; }

  /** Create a shallow immutable-data fork used for temporary admission contexts.
   * The fork starts at the same cache revision as its source, then diverges on
   * its own later mutations. This keeps diagnostic/replay evidence about the
   * copied environment honest without sharing mutable maps. */
  fork(): EnvironmentCore {
    const next = new EnvironmentCore();
    next.constants = new Map(this.constants);
    next.checked = new Map(this.checked);
    next.#mutationRevision = this.#mutationRevision;
    return next;
  }

  findConstant(name: Name): ConstantInfo | undefined { return this.constants.get(name); }
  getConstant(name: Name): ConstantInfo {
    const info = this.findConstant(name);
    if (!info) throw new KernelDeclarationError(`unknown constant: ${name}`);
    return info;
  }

  private addConstant(info: ConstantInfo): void { this.constants.set(info.name, info); this.#mutationRevision++; }
  private addChecked(entry: CheckedDeclaration): void { this.checked.set(entry.declaration.name, entry); this.#mutationRevision++; }

  assumptionsOf(name: Name): Set<Name> {
    const entry = this.checked.get(name);
    return entry ? new Set(entry.assumptions) : new Set();
  }

  replaceWith(other: EnvironmentCore): void {
    this.constants = new Map(other.constants);
    this.checked = new Map(other.checked);
    this.#mutationRevision++;
  }

  addQuotientPrimitive(name: Name, levelParams: Name[], type: Term, quotKind: string, assumptions: Set<Name> = new Set()): void {
    if (this.has(name)) throw new KernelDeclarationError(`duplicate declaration: ${name}`);
    this.addConstant({ kind: "quotInfo", name, levelParams, type, quotKind });
    this.addChecked({ declaration: { kind: "quotient", name, levelParams, type, quotKind }, assumptions: new Set(assumptions), generated: [] });
  }

  addCoreDeclaration(decl: CoreDeclaration, assumptions: Set<Name> = new Set(), recursorOptions: { allowRecursorFamilyBinderInfo?: boolean } = {}): Name[] {
    const knownPropFamilyArities = new Map<Name, number>();
    const knownDefinitions = new Map<Name, RecursorKnownDefinition>();
    for (const info of this.constants.values()) {
      const arity = propositionFamilyArity("type" in info ? info.type : undefined);
      if (arity !== undefined) knownPropFamilyArities.set(info.name, arity);
      if (info.kind === "defnInfo" && info.safety === "safe" && info.hints.kind !== "opaque") {
        knownDefinitions.set(info.name, { levelParams: info.levelParams, value: info.value });
      }
    }
    const infos = declarationToConstantInfo(decl, { ...recursorOptions, knownPropFamilyArities, knownDefinitions });
    const entries: CheckedDeclaration[] = [];
    const generated: Name[] = [];
    if (decl.kind === "inductive") {
      generated.push(...decl.constructors.map(c => c.name));
      const recName = `${decl.name}.rec`;
      const foundRecInfo = infos.find(info => info.kind === "recInfo" && info.name === recName);
      const recInfo = foundRecInfo?.kind === "recInfo" ? foundRecInfo : undefined;
      generated.push(recName);
      entries.push({ declaration: decl, assumptions: new Set(assumptions), generated });
      for (const c of decl.constructors) entries.push({ declaration: { kind: "constructor", name: c.name, levelParams: decl.levelParams, type: c.type, inductive: decl.name }, assumptions: new Set(assumptions), generated: [] });
      entries.push({ declaration: { kind: "recursor", name: recName, levelParams: recInfo?.levelParams ?? decl.levelParams, type: recInfo?.type, metadata: (recInfo?.metadata as { rules: { ctor: Name; nfields: number; recursiveFields: boolean[] }[]; [key: string]: unknown } | undefined) ?? { trustedBoundary: true, status: "stubbed", numParams: decl.numParams, numIndices: decl.numIndices, numMinors: decl.constructors.length, rules: recursorRulesForConstructors(decl.constructors, [decl.name], decl.numParams) } }, assumptions: new Set(assumptions), generated: [] });
    } else if (decl.kind === "mutualInductive") {
      generated.push(...decl.inductives.flatMap(i => [i.name, ...i.constructors.map(c => c.name), `${i.name}.rec`]));
      entries.push({ declaration: decl, assumptions: new Set(assumptions), generated });
      for (const ind of decl.inductives) {
        entries.push({ declaration: { kind: "inductive", name: ind.name, levelParams: decl.levelParams, type: ind.type, numParams: ind.numParams, numIndices: ind.numIndices, constructors: ind.constructors }, assumptions: new Set(assumptions), generated: ind.constructors.map(c => c.name) });
        for (const c of ind.constructors) entries.push({ declaration: { kind: "constructor", name: c.name, levelParams: decl.levelParams, type: c.type, inductive: ind.name }, assumptions: new Set(assumptions), generated: [] });
        const recName = `${ind.name}.rec`;
        const foundRecInfo = infos.find(info => info.kind === "recInfo" && info.name === recName);
        const recInfo = foundRecInfo?.kind === "recInfo" ? foundRecInfo : undefined;
        entries.push({ declaration: { kind: "recursor", name: recName, levelParams: recInfo?.levelParams ?? decl.levelParams, type: recInfo?.type, metadata: (recInfo?.metadata as { rules: { ctor: Name; nfields: number; recursiveFields: boolean[] }[]; [key: string]: unknown } | undefined) ?? { trustedBoundary: true, status: "stubbed", numParams: ind.numParams, numIndices: ind.numIndices, numMinors: decl.inductives.reduce((n,i)=>n+i.constructors.length,0), rules: recursorRulesForConstructors(ind.constructors, decl.inductives.map(i => i.name), ind.numParams) } }, assumptions: new Set(assumptions), generated: [] });
      }
    } else if (decl.kind === "quot") {
      entries.push({ declaration: decl, assumptions: new Set(assumptions), generated });
    } else {
      entries.push({ declaration: decl, assumptions: new Set(assumptions), generated });
    }

    const localNames = new Set<Name>();
    for (const entry of entries) {
      const n = entry.declaration.name;
      if (localNames.has(n)) throw new KernelDeclarationError(`duplicate declaration generated in batch: ${n}`);
      localNames.add(n);
      if (this.has(n)) throw new KernelDeclarationError(`duplicate declaration: ${n}`);
    }
    for (const info of infos) {
      if (!localNames.has(info.name)) throw new KernelDeclarationError(`internal declaration info without checked entry: ${info.name}`);
    }
    for (const info of infos) this.addConstant(info);
    for (const entry of entries) this.addChecked(entry);
    return generated.filter(n => n !== decl.name);
  }
}

export const portStatus_PSKernel_Environment_Basic = {
  source: "PSKernel/Environment/Basic.lean",
  target: "packages/kernel/src/PSKernel/Environment/Basic.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
