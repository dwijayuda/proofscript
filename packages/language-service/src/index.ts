import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { IncrementalCompilerSession, checkSource } from "@proofscript/compiler";
import { formatSource } from "@proofscript/formatter";

export interface Position {
  readonly line: number;
  readonly character: number;
}

export interface Range {
  readonly start: Position;
  readonly end: Position;
}

export interface TextDocumentSnapshot {
  readonly uri: string;
  readonly version: number;
  readonly generation: number;
  readonly text: string;
  readonly filePath?: string;
}

export interface TextDocumentContentChange {
  readonly range?: Range;
  readonly text: string;
}

export type AnalysisStatus = "accepted" | "rejected" | "unsupported" | "resource_exhausted" | "implementation_error";

export interface DiagnosticIdentity {
  readonly schemaVersion: 1;
  readonly code: string;
  readonly fingerprint: string;
}

export interface Diagnostic {
  readonly range: Range;
  readonly severity: 1 | 2;
  readonly code: string;
  readonly source: "ProofScript";
  readonly message: string;
  readonly data: {
    readonly identity: DiagnosticIdentity;
    readonly rawMessage: string;
    readonly phase: "compiler";
  };
}

export interface DiagnosticBundle {
  readonly uri: string;
  readonly version: number;
  readonly generation: number;
  readonly diagnostics: readonly Diagnostic[];
  readonly resultId: string;
}

export interface SurfaceFeatureOccurrence {
  readonly feature: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly range: Range;
}

export interface SourceDeclarationOccurrence {
  readonly name: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly type: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly nameStartOffset: number;
  readonly nameEndOffset: number;
  readonly range: Range;
  readonly selectionRange: Range;
}

export interface DocumentSymbolInfo {
  readonly name: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly detail: string;
  readonly range: Range;
  readonly selectionRange: Range;
}

export interface HoverInfo {
  readonly name: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly type: string;
  readonly range: Range;
}

export interface CompletionInfo {
  readonly label: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly detail: string;
  readonly sortText: string;
}

export type SemanticTokenKind = "function" | "enum" | "struct" | "class" | "variable";

export interface SemanticTokenInfo {
  readonly range: Range;
  readonly kind: SemanticTokenKind;
  readonly modifiers: readonly ("declaration" | "definition" | "readonly")[];
}

export interface SourceReferenceOccurrence {
  readonly rawName: string;
  readonly resolvedName: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly range: Range;
}

export interface ProjectDeclarationOccurrence extends SourceDeclarationOccurrence {
  readonly uri: string;
  readonly filePath?: string;
}

export interface ProjectReferenceOccurrence extends SourceReferenceOccurrence {
  readonly uri: string;
  readonly filePath?: string;
}

export interface LocationInfo {
  readonly uri: string;
  readonly range: Range;
}

export interface TextEditInfo {
  readonly range: Range;
  readonly newText: string;
}

export interface WorkspaceEditInfo {
  readonly changes: Readonly<Record<string, readonly TextEditInfo[]>>;
}

export interface Analysis {
  readonly uri: string;
  readonly version: number;
  readonly generation: number;
  readonly text: string;
  readonly filePath?: string;
  readonly status: AnalysisStatus;
  readonly declarations: readonly {
    readonly name: string;
    readonly kind: string;
    readonly type: string;
  }[];
  readonly assumptions: readonly string[];
  readonly surfaceFeatures: readonly SurfaceFeatureOccurrence[];
  readonly sourceDeclarations: readonly SourceDeclarationOccurrence[];
  readonly sourceReferences: readonly SourceReferenceOccurrence[];
  readonly projectDeclarations: readonly ProjectDeclarationOccurrence[];
  readonly projectReferences: readonly ProjectReferenceOccurrence[];
  readonly moduleReuse?: {
    readonly reused: readonly string[];
    readonly rebuilt: readonly string[];
  };
  readonly diagnostics: readonly Diagnostic[];
  readonly resultId: string;
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  throwIfCancellationRequested(): void;
}

export class CancelledError extends Error {
  constructor() {
    super("request cancelled");
    this.name = "CancelledError";
  }
}

export class CancellationSource {
  private cancelled = false;
  readonly token: CancellationToken;

  constructor() {
    const owner = this;
    this.token = {
      get isCancellationRequested() { return owner.cancelled; },
      throwIfCancellationRequested() {
        if (owner.cancelled) throw new CancelledError();
      },
    };
  }

  cancel(): void {
    this.cancelled = true;
  }
}

/**
 * Minimal editor-independent ProofScript semantic service.
 *
 * The service owns unsaved text/version state, but delegates all language semantics
 * to @proofscript/compiler. It does not contain a parser, elaborator, or checker.
 */
export class ProofScriptLanguageService {
  private readonly documents = new Map<string, TextDocumentSnapshot>();
  private readonly analyses = new Map<string, Analysis>();
  private readonly incrementalProjects = new Map<string, IncrementalCompilerSession>();
  private generation = 0;

  openDocument(uri: string, version: number, text: string, filePath?: string): TextDocumentSnapshot {
    if (this.documents.has(uri)) throw new Error(`document is already open: ${uri}`);
    return this.setDocument(uri, version, text, filePath ?? filePathFromUri(uri));
  }

  updateDocument(uri: string, version: number, changes: readonly TextDocumentContentChange[]): TextDocumentSnapshot {
    const current = this.requireDocument(uri);
    let text = current.text;
    for (const change of changes) {
      if (!change.range) {
        text = change.text;
        continue;
      }
      const start = offsetAt(text, change.range.start);
      const end = offsetAt(text, change.range.end);
      if (end < start) throw new Error("invalid document change range");
      text = text.slice(0, start) + change.text + text.slice(end);
    }
    return this.setDocument(uri, version, text, current.filePath);
  }

  replaceDocument(uri: string, version: number, text: string): TextDocumentSnapshot {
    const current = this.requireDocument(uri);
    return this.setDocument(uri, version, text, current.filePath);
  }

  closeDocument(uri: string): void {
    const document = this.documents.get(uri);
    this.documents.delete(uri);
    // Closing an overlay can change the source seen by any importer, so cached
    // editor analyses must be invalidated conservatively across open documents.
    this.analyses.clear();
    if (document?.filePath) this.incrementalProjects.delete(normalizePath(document.filePath));
  }

  getDocument(uri: string): TextDocumentSnapshot | undefined {
    return this.documents.get(uri);
  }

  analyze(uri: string, force = false, cancellation?: CancellationToken): Analysis {
    cancellation?.throwIfCancellationRequested();
    const document = this.requireDocument(uri);
    const cached = this.analyses.get(uri);
    if (!force && cached?.generation === document.generation) return cached;

    let status: AnalysisStatus = "accepted";
    let declarations: Analysis["declarations"] = [];
    let assumptions: readonly string[] = [];
    let surfaceFeatures: readonly SurfaceFeatureOccurrence[] = [];
    let sourceDeclarations: readonly SourceDeclarationOccurrence[] = [];
    let sourceReferences: readonly SourceReferenceOccurrence[] = [];
    let projectDeclarations: readonly ProjectDeclarationOccurrence[] = [];
    let projectReferences: readonly ProjectReferenceOccurrence[] = [];
    let rawProjectModules: readonly any[] = [];
    let rawGlobalReferences: readonly {
      readonly rawName: string;
      readonly resolvedName: string;
      readonly startOffset: number;
      readonly endOffset: number;
    }[] = [];
    let rawDeclarationLocations: readonly {
      readonly name: string;
      readonly qualifiedName: string;
      readonly kind: string;
      readonly startOffset: number;
      readonly endOffset: number;
      readonly nameStartOffset: number;
      readonly nameEndOffset: number;
    }[] = [];
    let localDeclarationNames: ReadonlySet<string> | undefined;
    let moduleReuse: Analysis["moduleReuse"];
    let diagnostics: readonly Diagnostic[] = [];

    try {
      let summary;
      let rawFeatures: readonly { readonly feature: string; readonly startOffset: number; readonly endOffset: number }[] = [];
      if (document.filePath) {
        const session = this.incrementalSession(document.filePath);
        const sourceProvider = this.sourceProvider();
        const checked = session.checkProjectFile(document.filePath, {
          sourceProvider,
        });
        const workspace = session.checkWorkspaceForFile(document.filePath, {
          sourceProvider,
          workspaceAdditionalFiles: [...this.documents.values()]
            .map((item) => item.filePath)
            .filter((item): item is string => Boolean(item)),
        });
        rawProjectModules = workspace.modules;
        summary = checked.summary;
        moduleReuse = {
          reused: [...checked.moduleReuse.reused],
          rebuilt: [...checked.moduleReuse.rebuilt],
        };
        const currentModule = checked.modules.find((module) =>
          normalizePath(module.source.filePath) === normalizePath(document.filePath!));
        rawFeatures = currentModule?.ownedFeatures ?? [];
        rawDeclarationLocations = currentModule?.declarationLocations ?? [];
        rawGlobalReferences = currentModule?.globalReferences ?? [];
        localDeclarationNames = new Set(currentModule?.declarations.map((declaration) => declaration.name) ?? []);
      } else {
        const checked = checkSource(document.text);
        summary = checked.summary;
        rawFeatures = checked.ownedFeatures;
        rawDeclarationLocations = checked.declarationLocations;
        rawGlobalReferences = checked.globalReferences;
      }
      cancellation?.throwIfCancellationRequested();

      status = summary.status;
      declarations = summary.declarations.map((declaration) => ({
        name: declaration.name,
        kind: declaration.kind,
        type: declaration.type,
      }));
      assumptions = [...summary.assumptions];
      surfaceFeatures = rawFeatures.map((use) => ({
        feature: use.feature,
        startOffset: use.startOffset,
        endOffset: use.endOffset,
        range: rangeFromOffsets(document.text, use.startOffset, use.endOffset),
      }));

      const semanticDeclarations = localDeclarationNames
        ? declarations.filter((declaration) => localDeclarationNames!.has(declaration.name))
        : declarations;
      sourceDeclarations = rawDeclarationLocations.map((location) => {
        const semantic = semanticDeclarations.find((declaration) =>
          declaration.name === location.qualifiedName || declaration.name === location.name
        );
        return {
          name: location.name,
          qualifiedName: location.qualifiedName,
          kind: semantic?.kind ?? location.kind,
          type: semantic?.type ?? "<type unavailable>",
          startOffset: location.startOffset,
          endOffset: location.endOffset,
          nameStartOffset: location.nameStartOffset,
          nameEndOffset: location.nameEndOffset,
          range: rangeFromOffsets(document.text, location.startOffset, location.endOffset),
          selectionRange: rangeFromOffsets(document.text, location.nameStartOffset, location.nameEndOffset),
        };
      });

      sourceReferences = rawGlobalReferences.map((reference) => ({
        rawName: reference.rawName,
        resolvedName: reference.resolvedName,
        startOffset: reference.startOffset,
        endOffset: reference.endOffset,
        range: rangeFromOffsets(document.text, reference.startOffset, reference.endOffset),
      }));

      if (rawProjectModules.length > 0) {
        projectDeclarations = rawProjectModules.flatMap((module: any) => {
          const moduleUri = pathToFileURL(module.source.filePath).toString();
          const semantic = module.declarations ?? [];
          return (module.declarationLocations ?? []).map((location: any) => {
            const declaration = semantic.find((item: any) =>
              item.name === location.qualifiedName || item.name === location.name
            );
            return {
              uri: moduleUri,
              filePath: module.source.filePath,
              name: location.name,
              qualifiedName: location.qualifiedName,
              kind: declaration?.kind ?? location.kind,
              type: declaration ? prettyDeclarationType(declaration) : "<type unavailable>",
              startOffset: location.startOffset,
              endOffset: location.endOffset,
              nameStartOffset: location.nameStartOffset,
              nameEndOffset: location.nameEndOffset,
              range: rangeFromOffsets(module.source.source, location.startOffset, location.endOffset),
              selectionRange: rangeFromOffsets(module.source.source, location.nameStartOffset, location.nameEndOffset),
            };
          });
        });
        projectReferences = rawProjectModules.flatMap((module: any) => {
          const moduleUri = pathToFileURL(module.source.filePath).toString();
          return (module.globalReferences ?? []).map((reference: any) => ({
            uri: moduleUri,
            filePath: module.source.filePath,
            rawName: reference.rawName,
            resolvedName: reference.resolvedName,
            startOffset: reference.startOffset,
            endOffset: reference.endOffset,
            range: rangeFromOffsets(module.source.source, reference.startOffset, reference.endOffset),
          }));
        });
      } else {
        projectDeclarations = sourceDeclarations.map((declaration) => ({
          ...declaration,
          uri: document.uri,
          ...(document.filePath ? { filePath: document.filePath } : {}),
        }));
        projectReferences = sourceReferences.map((reference) => ({
          ...reference,
          uri: document.uri,
          ...(document.filePath ? { filePath: document.filePath } : {}),
        }));
      }

      if (status !== "accepted") {
        const message = summary.message ?? `compiler status: ${status}`;
        diagnostics = [diagnosticFromFailure(message, document.text, status)];
      }
    } catch (error) {
      cancellation?.throwIfCancellationRequested();
      status = statusFromError(error);
      diagnostics = [diagnosticFromError(error, document.text, status)];
    }

    const resultId = analysisResultId(document.version, diagnostics, status, declarations, surfaceFeatures, sourceDeclarations, sourceReferences);
    const analysis: Analysis = {
      uri: document.uri,
      version: document.version,
      generation: document.generation,
      text: document.text,
      ...(document.filePath ? { filePath: document.filePath } : {}),
      status,
      declarations,
      assumptions,
      surfaceFeatures,
      sourceDeclarations,
      sourceReferences,
      projectDeclarations,
      projectReferences,
      ...(moduleReuse ? { moduleReuse } : {}),
      diagnostics,
      resultId,
    };

    cancellation?.throwIfCancellationRequested();
    const latest = this.documents.get(uri);
    if (latest?.generation === document.generation) this.analyses.set(uri, analysis);
    return analysis;
  }

  diagnostics(uri: string, cancellation?: CancellationToken): DiagnosticBundle {
    const analysis = this.analyze(uri, false, cancellation);
    return {
      uri: analysis.uri,
      version: analysis.version,
      generation: analysis.generation,
      diagnostics: analysis.diagnostics,
      resultId: analysis.resultId,
    };
  }

  documentSymbols(uri: string, cancellation?: CancellationToken): readonly DocumentSymbolInfo[] {
    const analysis = this.analyze(uri, false, cancellation);
    return analysis.sourceDeclarations.map((declaration) => ({
      name: declaration.name,
      qualifiedName: declaration.qualifiedName,
      kind: declaration.kind,
      detail: declaration.type,
      range: declaration.range,
      selectionRange: declaration.selectionRange,
    }));
  }

  hover(uri: string, position: Position, cancellation?: CancellationToken): HoverInfo | null {
    const analysis = this.analyze(uri, false, cancellation);
    const offset = offsetAt(analysis.text, position);
    const declaration = analysis.sourceDeclarations.find((item) =>
      offset >= item.nameStartOffset && offset < item.nameEndOffset
    );
    if (!declaration) return null;
    return {
      name: declaration.name,
      qualifiedName: declaration.qualifiedName,
      kind: declaration.kind,
      type: declaration.type,
      range: declaration.selectionRange,
    };
  }

  completion(uri: string, position: Position, cancellation?: CancellationToken): readonly CompletionInfo[] {
    const analysis = this.analyze(uri, false, cancellation);
    const offset = offsetAt(analysis.text, position);
    const before = analysis.text.slice(0, offset);
    const prefixMatch = before.match(/(?:^|[^A-Za-z0-9_'])(([A-Za-z_][A-Za-z0-9_']*)?)$/u);
    const prefix = prefixMatch?.[1] ?? "";
    const seen = new Set<string>();
    const items: CompletionInfo[] = [];

    for (const declaration of analysis.declarations) {
      cancellation?.throwIfCancellationRequested();
      const qualifiedName = declaration.name;
      const label = qualifiedName.split(".").at(-1) ?? qualifiedName;
      if (prefix && !label.startsWith(prefix) && !qualifiedName.startsWith(prefix)) continue;
      const key = `${qualifiedName}\u0000${declaration.kind}\u0000${declaration.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        label,
        qualifiedName,
        kind: declaration.kind,
        detail: declaration.type,
        sortText: `${label === prefix ? "0" : "1"}:${label}:${qualifiedName}`,
      });
    }

    return items.sort((left, right) => left.sortText.localeCompare(right.sortText));
  }

  semanticTokens(uri: string, cancellation?: CancellationToken): readonly SemanticTokenInfo[] {
    const analysis = this.analyze(uri, false, cancellation);
    const tokens: SemanticTokenInfo[] = [];
    const kindByName = new Map(analysis.projectDeclarations.map((item) => [
      item.qualifiedName,
      semanticTokenKind(item.kind),
    ] as const));

    for (const declaration of analysis.sourceDeclarations) {
      cancellation?.throwIfCancellationRequested();
      tokens.push({
        range: declaration.selectionRange,
        kind: semanticTokenKind(declaration.kind),
        modifiers: ["declaration", "definition"],
      });
    }

    for (const reference of analysis.sourceReferences) {
      cancellation?.throwIfCancellationRequested();
      const kind = kindByName.get(reference.resolvedName);
      if (!kind) continue;
      tokens.push({
        range: reference.range,
        kind,
        modifiers: [],
      });
    }

    return dedupeSemanticTokens(tokens).sort((left, right) =>
      comparePosition(left.range.start, right.range.start)
      || comparePosition(left.range.end, right.range.end)
      || left.kind.localeCompare(right.kind)
    );
  }

  formatDocument(uri: string, cancellation?: CancellationToken): readonly TextEditInfo[] {
    cancellation?.throwIfCancellationRequested();
    const document = this.requireDocument(uri);
    const formatted = formatSource(document.text);
    cancellation?.throwIfCancellationRequested();
    if (!formatted.changed) return [];
    return [{
      range: {
        start: { line: 0, character: 0 },
        end: positionAt(document.text, document.text.length),
      },
      newText: formatted.formatted,
    }];
  }

  definition(uri: string, position: Position, cancellation?: CancellationToken): LocationInfo | null {
    const analysis = this.analyze(uri, false, cancellation);
    const symbol = symbolAtPosition(analysis, position);
    if (!symbol) return null;
    const declaration = analysis.projectDeclarations.find((item) => item.qualifiedName === symbol);
    return declaration ? { uri: declaration.uri, range: declaration.selectionRange } : null;
  }

  references(
    uri: string,
    position: Position,
    includeDeclaration = true,
    cancellation?: CancellationToken,
  ): readonly LocationInfo[] {
    const analysis = this.analyze(uri, false, cancellation);
    const symbol = symbolAtPosition(analysis, position);
    if (!symbol) return [];
    const locations: LocationInfo[] = [];
    if (includeDeclaration) {
      for (const declaration of analysis.projectDeclarations) {
        cancellation?.throwIfCancellationRequested();
        if (declaration.qualifiedName === symbol) {
          locations.push({ uri: declaration.uri, range: declaration.selectionRange });
        }
      }
    }
    for (const reference of analysis.projectReferences) {
      cancellation?.throwIfCancellationRequested();
      if (reference.resolvedName === symbol) {
        locations.push({ uri: reference.uri, range: reference.range });
      }
    }
    return dedupeLocations(locations);
  }

  rename(
    uri: string,
    position: Position,
    newName: string,
    cancellation?: CancellationToken,
  ): WorkspaceEditInfo {
    if (!/^[A-Za-z_][A-Za-z0-9_']*$/u.test(newName)) {
      throw new Error(`invalid ProofScript identifier for rename: ${newName}`);
    }
    const analysis = this.analyze(uri, false, cancellation);
    const symbol = symbolAtPosition(analysis, position);
    if (!symbol) throw new Error("no resolved global symbol at rename position");
    const declaration = analysis.projectDeclarations.find((item) => item.qualifiedName === symbol);
    if (!declaration) throw new Error(`source declaration is unavailable for global symbol '${symbol}'`);

    const dot = symbol.lastIndexOf(".");
    const namespacePrefix = dot >= 0 ? symbol.slice(0, dot + 1) : "";
    const replacementSymbol = namespacePrefix + newName;
    if (
      replacementSymbol !== symbol
      && analysis.projectDeclarations.some((item) => item.qualifiedName === replacementSymbol)
    ) {
      throw new Error(`rename would collide with existing declaration '${replacementSymbol}'`);
    }

    const changes = new Map<string, TextEditInfo[]>();
    const add = (locationUri: string, range: Range): void => {
      const edits = changes.get(locationUri) ?? [];
      edits.push({ range, newText: newName });
      changes.set(locationUri, edits);
    };
    add(declaration.uri, declaration.selectionRange);
    for (const reference of analysis.projectReferences) {
      cancellation?.throwIfCancellationRequested();
      if (reference.resolvedName === symbol) add(reference.uri, reference.range);
    }

    const out: Record<string, readonly TextEditInfo[]> = {};
    for (const [locationUri, edits] of changes) {
      out[locationUri] = dedupeEdits(edits).sort((left, right) =>
        comparePosition(right.range.start, left.range.start)
      );
    }
    return { changes: out };
  }

  private requireDocument(uri: string): TextDocumentSnapshot {
    const document = this.documents.get(uri);
    if (!document) throw new Error(`document is not open: ${uri}`);
    return document;
  }

  private setDocument(uri: string, version: number, text: string, filePath?: string): TextDocumentSnapshot {
    const current = this.documents.get(uri);
    if (current && version <= current.version) {
      throw new Error(`document version must increase: current=${current.version}, received=${version}`);
    }

    const snapshot: TextDocumentSnapshot = {
      uri,
      version,
      generation: ++this.generation,
      text,
      ...(filePath ? { filePath: path.resolve(filePath) } : {}),
    };
    this.documents.set(uri, snapshot);
    // Any unsaved document can be part of another open document's import closure.
    // Clear editor-result caches globally; IncrementalCompilerSession still reuses
    // modules whose source + checked dependency environment remain unchanged.
    this.analyses.clear();
    return snapshot;
  }

  private incrementalSession(filePath: string): IncrementalCompilerSession {
    const key = normalizePath(filePath);
    let session = this.incrementalProjects.get(key);
    if (!session) {
      session = new IncrementalCompilerSession();
      this.incrementalProjects.set(key, session);
    }
    return session;
  }

  private sourceProvider(): (filePath: string) => string | undefined {
    const overlays = new Map<string, string>();
    for (const document of this.documents.values()) {
      if (document.filePath) overlays.set(normalizePath(document.filePath), document.text);
    }
    return (filePath) => overlays.get(normalizePath(filePath));
  }
}

function symbolAtPosition(analysis: Analysis, position: Position): string | null {
  const offset = offsetAt(analysis.text, position);
  const declaration = analysis.sourceDeclarations.find((item) =>
    offset >= item.nameStartOffset && offset < item.nameEndOffset
  );
  if (declaration) return declaration.qualifiedName;
  const reference = analysis.sourceReferences.find((item) =>
    offset >= item.startOffset && offset < item.endOffset
  );
  return reference?.resolvedName ?? null;
}

function semanticTokenKind(kind: string): SemanticTokenKind {
  switch (kind) {
    case "inductive":
      return "enum";
    case "structure":
      return "struct";
    case "class":
      return "class";
    case "axiom":
    case "instance":
      return "variable";
    default:
      return "function";
  }
}

function dedupeSemanticTokens(tokens: readonly SemanticTokenInfo[]): SemanticTokenInfo[] {
  const seen = new Set<string>();
  const out: SemanticTokenInfo[] = [];
  for (const token of tokens) {
    const key = [
      token.range.start.line,
      token.range.start.character,
      token.range.end.line,
      token.range.end.character,
      token.kind,
      token.modifiers.join(","),
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}

function dedupeLocations(locations: readonly LocationInfo[]): LocationInfo[] {
  const seen = new Set<string>();
  const out: LocationInfo[] = [];
  for (const location of locations) {
    const key = `${location.uri}:${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(location);
  }
  return out;
}

function dedupeEdits(edits: readonly TextEditInfo[]): TextEditInfo[] {
  const seen = new Set<string>();
  const out: TextEditInfo[] = [];
  for (const edit of edits) {
    const key = `${edit.range.start.line}:${edit.range.start.character}:${edit.range.end.line}:${edit.range.end.character}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edit);
  }
  return out;
}

function comparePosition(left: Position, right: Position): number {
  return left.line - right.line || left.character - right.character;
}

function prettyDeclarationType(declaration: any): string {
  if (typeof declaration?.type === "string") return declaration.type;
  try {
    return JSON.stringify(declaration?.type ?? null);
  } catch {
    return "<type unavailable>";
  }
}

function diagnosticFromError(error: unknown, sourceText: string, status: AnalysisStatus): Diagnostic {
  const message = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.constructor?.name ?? error.name : "";
  const code =
    errorName === "ParseError" ? "PSLS1001" :
    errorName === "ElaborationError" ? "PSLS2001" :
    status === "unsupported" ? "PSLS3001" :
    status === "resource_exhausted" ? "PSLS4001" :
    "PSLS0001";
  return makeDiagnostic(code, message, sourceText, status === "unsupported" ? 2 : 1);
}

function diagnosticFromFailure(message: string, sourceText: string, status: AnalysisStatus): Diagnostic {
  const code =
    status === "unsupported" ? "PSLS3001" :
    status === "resource_exhausted" ? "PSLS4001" :
    status === "implementation_error" ? "PSLS5001" :
    "PSLS0001";
  return makeDiagnostic(code, message, sourceText, status === "unsupported" ? 2 : 1);
}

function makeDiagnostic(code: string, message: string, sourceText: string, severity: 1 | 2): Diagnostic {
  const offset = offsetFromCompilerMessage(message, sourceText.length);
  const range = rangeAtOffset(sourceText, offset);
  const raw = JSON.stringify({ code, severity, range, message });
  return {
    range,
    severity,
    code,
    source: "ProofScript",
    message,
    data: {
      identity: {
        schemaVersion: 1,
        code,
        fingerprint: sha256(raw).slice(0, 24),
      },
      rawMessage: message,
      phase: "compiler",
    },
  };
}

function statusFromError(error: unknown): AnalysisStatus {
  const name = error instanceof Error ? error.constructor?.name ?? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "UnsupportedFeature" || /\bunsupported\b/i.test(message)) return "unsupported";
  if (name === "ResourceExhausted" || /resource[_ -]?exhaust/i.test(message)) return "resource_exhausted";
  return "rejected";
}

function analysisResultId(
  version: number,
  diagnostics: readonly Diagnostic[],
  status: AnalysisStatus,
  declarations: Analysis["declarations"],
  surfaceFeatures: readonly SurfaceFeatureOccurrence[],
  sourceDeclarations: readonly SourceDeclarationOccurrence[],
  sourceReferences: readonly SourceReferenceOccurrence[],
): string {
  return sha256(JSON.stringify({
    version,
    status,
    diagnostics: diagnostics.map((diagnostic) => diagnostic.data.identity.fingerprint),
    declarations: declarations.map((declaration) => [declaration.name, declaration.kind, declaration.type]),
    surfaceFeatures: surfaceFeatures.map((feature) => [feature.feature, feature.startOffset, feature.endOffset]),
    sourceDeclarations: sourceDeclarations.map((declaration) => [
      declaration.qualifiedName,
      declaration.kind,
      declaration.type,
      declaration.startOffset,
      declaration.endOffset,
      declaration.nameStartOffset,
      declaration.nameEndOffset,
    ]),
    sourceReferences: sourceReferences.map((reference) => [
      reference.rawName,
      reference.resolvedName,
      reference.startOffset,
      reference.endOffset,
    ]),
  })).slice(0, 24);
}

function offsetFromCompilerMessage(message: string, textLength: number): number {
  const patterns = [
    /\boffset\s+(\d+)\b/i,
    /\(offset\s+(\d+)\)/i,
    /\bat\s+offset\s+(\d+)\b/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return Math.max(0, Math.min(textLength, Number(match[1])));
  }
  return 0;
}

function rangeAtOffset(text: string, offset: number): Range {
  const start = positionAt(text, offset);
  const end = positionAt(text, Math.min(text.length, offset + (offset < text.length ? 1 : 0)));
  return { start, end };
}

function rangeFromOffsets(text: string, startOffset: number, endOffset: number): Range {
  const start = Math.max(0, Math.min(text.length, startOffset));
  const end = Math.max(start, Math.min(text.length, endOffset));
  return { start: positionAt(text, start), end: positionAt(text, end) };
}

function positionAt(text: string, offset: number): Position {
  const safe = Math.max(0, Math.min(text.length, offset));
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < safe; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, character: safe - lineStart };
}

function offsetAt(text: string, position: Position): number {
  if (position.line < 0 || position.character < 0) throw new Error("invalid negative document position");
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < text.length && line < position.line; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  if (line !== position.line) throw new Error(`document position line is out of range: ${position.line}`);
  return Math.min(text.length, lineStart + position.character);
}

function filePathFromUri(uri: string): string | undefined {
  if (!uri.startsWith("file://")) return undefined;
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

function normalizePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
