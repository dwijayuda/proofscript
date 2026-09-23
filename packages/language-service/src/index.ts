import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IncrementalCompilerSession, checkSource } from "@proofscript/compiler";

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
        const checked = this.incrementalSession(document.filePath).checkProjectFile(document.filePath, {
          sourceProvider: this.sourceProvider(),
        });
        summary = checked.summary;
        moduleReuse = {
          reused: [...checked.moduleReuse.reused],
          rebuilt: [...checked.moduleReuse.rebuilt],
        };
        const currentModule = checked.modules.find((module) =>
          normalizePath(module.source.filePath) === normalizePath(document.filePath!));
        rawFeatures = currentModule?.ownedFeatures ?? [];
        rawDeclarationLocations = currentModule?.declarationLocations ?? [];
        localDeclarationNames = new Set(currentModule?.declarations.map((declaration) => declaration.name) ?? []);
      } else {
        const checked = checkSource(document.text);
        summary = checked.summary;
        rawFeatures = checked.ownedFeatures;
        rawDeclarationLocations = checked.declarationLocations;
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

      if (status !== "accepted") {
        const message = summary.message ?? `compiler status: ${status}`;
        diagnostics = [diagnosticFromFailure(message, document.text, status)];
      }
    } catch (error) {
      cancellation?.throwIfCancellationRequested();
      status = statusFromError(error);
      diagnostics = [diagnosticFromError(error, document.text, status)];
    }

    const resultId = analysisResultId(document.version, diagnostics, status, declarations, surfaceFeatures, sourceDeclarations);
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
