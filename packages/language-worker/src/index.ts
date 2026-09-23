import { Worker } from "node:worker_threads";
import type {
  Analysis,
  CompletionInfo,
  DiagnosticBundle,
  LocationInfo,
  DocumentSymbolInfo,
  HoverInfo,
  Position,
  SemanticTokenInfo,
  TextEditInfo,
  WorkspaceEditInfo,
  TextDocumentContentChange,
} from "@proofscript/language-service";

export interface WorkerDocumentSnapshot {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
  readonly filePath?: string;
}

export interface LanguageWorkerClientOptions {
  readonly autoRestart?: boolean;
  readonly cooperativeCancellation?: boolean;
  readonly hardCancelGraceMs?: number;
  readonly label?: string;
}

interface PendingRequest {
  readonly resolve: (value: any) => void;
  readonly reject: (reason: any) => void;
  readonly ownerId?: number | string | null;
  readonly cancelFlag?: Int32Array;
  running: boolean;
  hardCancelTimer?: ReturnType<typeof setTimeout>;
}

export class LanguageWorkerCancelledError extends Error {
  constructor(message = "language worker request cancelled") {
    super(message);
    this.name = "LanguageWorkerCancelledError";
  }
}

export class LanguageWorkerCrashedError extends Error {
  constructor(message = "language worker crashed") {
    super(message);
    this.name = "LanguageWorkerCrashedError";
  }
}

/**
 * Worker-thread isolation for the compiler-backed language service.
 *
 * This client owns transport, cancellation, crash recovery, and document-state replay.
 * It deliberately owns no ProofScript parser/elaborator semantics.
 */
export class LanguageWorkerClient {
  private worker: Worker | undefined;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly documents = new Map<string, WorkerDocumentSnapshot>();
  private seq = 1;
  private readyPromise: Promise<void> | undefined;
  private readyResolve: (() => void) | undefined;
  private readyReject: ((reason: any) => void) | undefined;
  private restartPromise: Promise<void> | undefined;
  private intentionallyTerminating = false;
  private readonly options: LanguageWorkerClientOptions;
  private readonly label: string;
  private statsState = {
    starts: 0,
    restarts: 0,
    crashes: 0,
    requests: 0,
    responses: 0,
    cancellations: 0,
    hardCancellations: 0,
    stateReplays: 0,
  };

  constructor(options: LanguageWorkerClientOptions = {}) {
    this.options = options;
    this.label = options.label ?? "semantic";
  }

  async start(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    if (this.worker) return this.ready();
    this.spawn();
    return this.ready();
  }

  async stop(): Promise<void> {
    if (this.restartPromise) await this.restartPromise.catch(() => {});
    const worker = this.worker;
    this.worker = undefined;
    this.readyPromise = undefined;
    this.rejectAll(new LanguageWorkerCancelledError(`${this.label} worker stopped`));
    if (!worker) return;
    this.intentionallyTerminating = true;
    try {
      await worker.terminate();
    } finally {
      this.intentionallyTerminating = false;
    }
  }

  restart(reason = "restart"): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    this.statsState.restarts++;
    this.restartPromise = (async () => {
      const old = this.worker;
      this.worker = undefined;
      this.readyPromise = undefined;
      this.rejectAll(new LanguageWorkerCancelledError(`${this.label} worker ${reason}`));
      if (old) {
        this.intentionallyTerminating = true;
        try {
          await old.terminate();
        } finally {
          this.intentionallyTerminating = false;
        }
      }
      this.spawn();
      await this.ready();
      if (this.documents.size) this.statsState.stateReplays++;
    })().finally(() => {
      this.restartPromise = undefined;
    });
    return this.restartPromise;
  }

  openDocument(uri: string, version: number, text: string, filePath?: string): void {
    if (this.documents.has(uri)) throw new Error(`document is already open: ${uri}`);
    const snapshot: WorkerDocumentSnapshot = { uri, version, text, ...(filePath ? { filePath } : {}) };
    this.documents.set(uri, snapshot);
    this.postMutation("openDocument", snapshot);
  }

  replaceDocument(uri: string, version: number, text: string): void {
    const current = this.requireDocument(uri);
    if (version <= current.version) throw new Error(`document version must increase: current=${current.version}, received=${version}`);
    const snapshot: WorkerDocumentSnapshot = { ...current, version, text };
    this.documents.set(uri, snapshot);
    this.postMutation("replaceDocument", { uri, version, text });
  }

  updateDocument(uri: string, version: number, changes: readonly TextDocumentContentChange[]): void {
    const current = this.requireDocument(uri);
    if (version <= current.version) throw new Error(`document version must increase: current=${current.version}, received=${version}`);
    let text = current.text;
    for (const change of changes) text = applyChange(text, change);
    const snapshot: WorkerDocumentSnapshot = { ...current, version, text };
    this.documents.set(uri, snapshot);
    this.postMutation("updateDocument", { uri, version, changes });
  }

  closeDocument(uri: string): void {
    if (!this.documents.delete(uri)) return;
    this.postMutation("closeDocument", { uri });
  }

  getDocument(uri: string): WorkerDocumentSnapshot | undefined {
    return this.documents.get(uri);
  }

  async ping(ownerId?: number | string | null): Promise<{ readonly ok: true; readonly pid: number }> {
    return this.request("ping", {}, ownerId);
  }

  async analyze(uri: string, ownerId?: number | string | null): Promise<Analysis> {
    return this.request("analyze", { uri }, ownerId);
  }

  async diagnostics(uri: string, ownerId?: number | string | null): Promise<DiagnosticBundle> {
    return this.request("diagnostics", { uri }, ownerId);
  }

  async documentSymbols(uri: string, ownerId?: number | string | null): Promise<readonly DocumentSymbolInfo[]> {
    return this.request("documentSymbols", { uri }, ownerId);
  }

  async hover(uri: string, position: Position, ownerId?: number | string | null): Promise<HoverInfo | null> {
    return this.request("hover", { uri, position }, ownerId);
  }

  async completion(uri: string, position: Position, ownerId?: number | string | null): Promise<readonly CompletionInfo[]> {
    return this.request("completion", { uri, position }, ownerId);
  }

  async semanticTokens(uri: string, ownerId?: number | string | null): Promise<readonly SemanticTokenInfo[]> {
    return this.request("semanticTokens", { uri }, ownerId);
  }

  async formatDocument(uri: string, ownerId?: number | string | null): Promise<readonly TextEditInfo[]> {
    return this.request("formatDocument", { uri }, ownerId);
  }

  async definition(uri: string, position: Position, ownerId?: number | string | null): Promise<LocationInfo | null> {
    return this.request("definition", { uri, position }, ownerId);
  }

  async references(
    uri: string,
    position: Position,
    includeDeclaration = true,
    ownerId?: number | string | null,
  ): Promise<readonly LocationInfo[]> {
    return this.request("references", { uri, position, includeDeclaration }, ownerId);
  }

  async rename(
    uri: string,
    position: Position,
    newName: string,
    ownerId?: number | string | null,
  ): Promise<WorkspaceEditInfo> {
    return this.request("rename", { uri, position, newName }, ownerId);
  }

  async request<T = any>(operation: string, args: any = {}, ownerId?: number | string | null): Promise<T> {
    await this.start();
    const seq = this.seq++;
    this.statsState.requests++;
    const cancelFlag = this.options.cooperativeCancellation === false
      ? undefined
      : new Int32Array(new SharedArrayBuffer(4));

    return new Promise<T>((resolve, reject) => {
      this.pending.set(seq, { resolve, reject, ownerId, cancelFlag, running: false });
      this.worker!.postMessage({
        kind: "request",
        seq,
        operation,
        args,
        ...(cancelFlag ? { cancelBuffer: cancelFlag.buffer } : {}),
      });
    });
  }

  cancelOwner(ownerId: number | string | null | undefined, hardCancelGraceMs?: number): boolean {
    if (ownerId === undefined || ownerId === null) return false;
    const matches = [...this.pending.entries()].filter(([, item]) => item.ownerId === ownerId);
    if (!matches.length) return false;
    this.statsState.cancellations++;
    const grace = hardCancelGraceMs ?? this.options.hardCancelGraceMs ?? 25;

    for (const [seq, item] of matches) {
      if (item.cancelFlag) Atomics.store(item.cancelFlag, 0, 1);
      if (!item.running) {
        this.pending.delete(seq);
        item.reject(new LanguageWorkerCancelledError(`${this.label} worker request ${String(ownerId)} cancelled before execution`));
        continue;
      }
      if (!item.hardCancelTimer) {
        item.hardCancelTimer = setTimeout(() => {
          const stillRunning = [...this.pending.values()].some((pending) => pending.ownerId === ownerId && pending.running);
          if (!stillRunning) return;
          this.statsState.hardCancellations++;
          void this.restart(`hard-cancelled request ${String(ownerId)}`);
        }, Math.max(0, grace));
      }
    }
    return true;
  }

  stats(): Readonly<typeof this.statsState> & { readonly label: string; readonly pending: number; readonly documents: number } {
    return {
      ...this.statsState,
      label: this.label,
      pending: this.pending.size,
      documents: this.documents.size,
    };
  }

  private spawn(): void {
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    this.worker = worker;
    this.statsState.starts++;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    worker.on("message", (message: any) => this.onMessage(worker, message));
    worker.on("error", (error: any) => this.onCrash(worker, error));
    worker.on("exit", (code: number) => {
      if (code !== 0) this.onCrash(worker, new LanguageWorkerCrashedError(`${this.label} worker exited with code ${code}`));
    });
    worker.postMessage({
      kind: "init",
      documents: [...this.documents.values()],
    });
  }

  private ready(): Promise<void> {
    return this.readyPromise ?? Promise.resolve();
  }

  private onMessage(worker: Worker, message: any): void {
    if (worker !== this.worker) return;
    if (message?.kind === "ready") {
      this.readyResolve?.();
      this.readyResolve = undefined;
      this.readyReject = undefined;
      return;
    }
    if (message?.kind === "workerError") {
      this.readyReject?.(deserializeError(message.error));
      return;
    }
    if (message?.kind === "requestStarted") {
      const pending = this.pending.get(message.seq);
      if (pending) pending.running = true;
      return;
    }
    if (message?.kind !== "response") return;

    const pending = this.pending.get(message.seq);
    if (!pending) return;
    this.pending.delete(message.seq);
    this.statsState.responses++;
    if (pending.hardCancelTimer) clearTimeout(pending.hardCancelTimer);
    if (message.error) pending.reject(deserializeError(message.error));
    else pending.resolve(message.result);
  }

  private onCrash(worker: Worker, error: unknown): void {
    if (worker !== this.worker || this.intentionallyTerminating) return;
    this.statsState.crashes++;
    this.worker = undefined;
    this.readyReject?.(error);
    this.readyPromise = undefined;
    this.rejectAll(error instanceof Error ? error : new LanguageWorkerCrashedError(String(error)));
    if (this.options.autoRestart !== false && !this.restartPromise) void this.restart("after crash");
  }

  private postMutation(operation: string, args: any): void {
    if (!this.worker || this.restartPromise) return;
    this.worker.postMessage({ kind: "mutation", operation, args });
  }

  private requireDocument(uri: string): WorkerDocumentSnapshot {
    const document = this.documents.get(uri);
    if (!document) throw new Error(`document is not open: ${uri}`);
    return document;
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      if (pending.hardCancelTimer) clearTimeout(pending.hardCancelTimer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function applyChange(text: string, change: TextDocumentContentChange): string {
  if (!change.range) return change.text;
  const start = offsetAt(text, change.range.start);
  const end = offsetAt(text, change.range.end);
  if (end < start) throw new Error("invalid document change range");
  return text.slice(0, start) + change.text + text.slice(end);
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

function deserializeError(input: any): Error {
  const name = input?.name ?? "Error";
  if (name === "CancelledError" || name === "LanguageWorkerCancelledError") {
    const error = new LanguageWorkerCancelledError(input?.message ?? "language worker request cancelled");
    if (input?.stack) error.stack = input.stack;
    return error;
  }
  const error = new Error(input?.message ?? String(input));
  error.name = name;
  if (input?.stack) error.stack = input.stack;
  return error;
}
