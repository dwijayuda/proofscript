import { fileURLToPath } from "node:url";
import {
  LanguageWorkerCancelledError,
  LanguageWorkerClient,
} from "@proofscript/language-worker";

interface Position {
  readonly line: number;
  readonly character: number;
}

interface Range {
  readonly start: Position;
  readonly end: Position;
}

interface ContentChange {
  readonly range?: Range;
  readonly text: string;
}

interface TextDocument {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
}

interface RpcMessage {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: any;
}

export interface LspServerOptions {
  readonly diagnosticsDebounceMs?: number;
}

export function startLspServer(options: LspServerOptions = {}): void {
  new ProofScriptLanguageServer(options).start();
}

/**
 * Thin LSP transport over the isolated language worker.
 *
 * This package owns JSON-RPC/LSP framing and lifecycle only. It contains no
 * ProofScript parser, elaborator, kernel, or duplicate semantic implementation.
 */
export class ProofScriptLanguageServer {
  private readonly documents = new Map<string, TextDocument>();
  private readonly worker = new LanguageWorkerClient({
    autoRestart: true,
    cooperativeCancellation: true,
    hardCancelGraceMs: 25,
    label: "lsp",
  });
  private readonly diagnosticOwners = new Map<string, string>();
  private readonly diagnosticTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly diagnosticsDebounceMs: number;
  private shutdownRequested = false;
  private input: any = (Buffer as any).alloc(0);

  constructor(options: LspServerOptions = {}) {
    this.diagnosticsDebounceMs = Math.max(0, Math.trunc(options.diagnosticsDebounceMs ?? 15));
  }

  start(): void {
    process.stdin.on("data", (chunk: any) => {
      this.input = (Buffer as any).concat([this.input, chunk]);
      this.drain();
    });
    process.stdin.on("end", () => {
      if (!this.shutdownRequested) process.exit(0);
    });
  }

  private drain(): void {
    while (true) {
      const headerEnd = this.input.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.input.slice(0, headerEnd).toString("utf8");
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.input = this.input.slice(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (this.input.length < bodyStart + length) return;
      const body = this.input.slice(bodyStart, bodyStart + length).toString("utf8");
      this.input = this.input.slice(bodyStart + length);
      try {
        void this.handle(JSON.parse(body) as RpcMessage);
      } catch (error) {
        this.log(`invalid LSP message: ${messageOf(error)}`);
      }
    }
  }

  private async handle(message: RpcMessage): Promise<void> {
    if (!message.method) return;

    try {
      switch (message.method) {
        case "$/cancelRequest": {
          this.worker.cancelOwner(requestId(message.params?.id));
          return;
        }

        case "initialize": {
          await this.worker.start();
          return this.reply(message.id, {
            capabilities: {
              positionEncoding: "utf-16",
              textDocumentSync: {
                openClose: true,
                change: 2,
                save: false,
              },
              diagnosticProvider: {
                identifier: "proofscript",
                interFileDependencies: true,
                workspaceDiagnostics: false,
              },
            },
            serverInfo: {
              name: "ProofScript LSP",
              version: "0.1.0-dev.0",
            },
            experimental: {
              proofscript: {
                protocolVersion: 1,
                architecture: "compiler -> language-service -> language-worker -> lsp",
                compilerBacked: true,
                duplicateParser: false,
                cooperativeCancellation: true,
                hardCancelFallback: true,
              },
            },
          });
        }

        case "initialized":
          return;

        case "shutdown": {
          this.shutdownRequested = true;
          for (const timer of this.diagnosticTimers.values()) clearTimeout(timer);
          this.diagnosticTimers.clear();
          for (const owner of this.diagnosticOwners.values()) this.worker.cancelOwner(owner, 0);
          this.diagnosticOwners.clear();
          await this.worker.stop();
          return this.reply(message.id, null);
        }

        case "exit":
          process.exit(this.shutdownRequested ? 0 : 1);
          return;

        case "textDocument/didOpen": {
          const td = message.params?.textDocument;
          if (!td || typeof td.uri !== "string" || typeof td.text !== "string") return;
          const version = typeof td.version === "number" ? td.version : 0;
          const document = { uri: td.uri, version, text: td.text };
          this.documents.set(td.uri, document);
          this.worker.openDocument(td.uri, version, td.text, filePathFromUri(td.uri));
          this.scheduleDiagnostics(td.uri, version);
          return;
        }

        case "textDocument/didChange": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return;
          const current = this.documents.get(uri);
          if (!current) return;
          const version = typeof message.params?.textDocument?.version === "number"
            ? message.params.textDocument.version
            : current.version + 1;
          const changes = Array.isArray(message.params?.contentChanges)
            ? message.params.contentChanges as readonly ContentChange[]
            : [];
          let text = current.text;
          for (const change of changes) text = applyContentChange(text, change);
          this.documents.set(uri, { uri, version, text });
          this.worker.updateDocument(uri, version, changes);
          this.scheduleDiagnostics(uri, version);
          return;
        }

        case "textDocument/didClose": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return;
          this.documents.delete(uri);
          const timer = this.diagnosticTimers.get(uri);
          if (timer) clearTimeout(timer);
          this.diagnosticTimers.delete(uri);
          const owner = this.diagnosticOwners.get(uri);
          if (owner) this.worker.cancelOwner(owner, 0);
          this.diagnosticOwners.delete(uri);
          this.worker.closeDocument(uri);
          this.notify("textDocument/publishDiagnostics", { uri, diagnostics: [] });
          return;
        }

        case "textDocument/diagnostic": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const bundle = await this.worker.diagnostics(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version || latest.version !== bundle.version) {
              return this.error(message.id, -32801, "document changed while diagnostics were running");
            }
            return this.reply(message.id, {
              kind: "full",
              resultId: bundle.resultId,
              items: bundle.diagnostics,
            });
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) {
              return this.error(message.id, -32800, "request cancelled");
            }
            throw error;
          }
        }

        default:
          if (message.id !== undefined) this.error(message.id, -32601, `method not found: ${message.method}`);
          return;
      }
    } catch (error) {
      if (message.id !== undefined) this.error(message.id, -32603, messageOf(error));
      else this.log(`${message.method}: ${messageOf(error)}`);
    }
  }

  private scheduleDiagnostics(uri: string, version: number): void {
    const previousTimer = this.diagnosticTimers.get(uri);
    if (previousTimer) clearTimeout(previousTimer);

    const previousOwner = this.diagnosticOwners.get(uri);
    if (previousOwner) this.worker.cancelOwner(previousOwner);

    const timer = setTimeout(() => {
      this.diagnosticTimers.delete(uri);
      void this.publishDiagnostics(uri, version);
    }, this.diagnosticsDebounceMs);
    this.diagnosticTimers.set(uri, timer);
  }

  private async publishDiagnostics(uri: string, version: number): Promise<void> {
    const owner = `diagnostics:${uri}:${version}`;
    this.diagnosticOwners.set(uri, owner);
    try {
      const bundle = await this.worker.diagnostics(uri, owner);
      const latest = this.documents.get(uri);
      if (!latest || latest.version !== version || bundle.version !== version) return;
      this.notify("textDocument/publishDiagnostics", {
        uri,
        version,
        diagnostics: bundle.diagnostics,
      });
    } catch (error) {
      if (!(error instanceof LanguageWorkerCancelledError)) {
        this.log(`diagnostics ${uri}: ${messageOf(error)}`);
      }
    } finally {
      if (this.diagnosticOwners.get(uri) === owner) this.diagnosticOwners.delete(uri);
    }
  }

  private reply(id: RpcMessage["id"], result: any): void {
    if (id === undefined) return;
    this.write({ jsonrpc: "2.0", id, result });
  }

  private error(id: RpcMessage["id"], code: number, message: string): void {
    if (id === undefined) return;
    this.write({ jsonrpc: "2.0", id, error: { code, message } });
  }

  private notify(method: string, params: any): void {
    if (this.shutdownRequested && method !== "textDocument/publishDiagnostics") return;
    this.write({ jsonrpc: "2.0", method, params });
  }

  private write(message: any): void {
    const body = JSON.stringify(message);
    process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
  }

  private log(message: string): void {
    process.stderr.write(`[proofscript-lsp] ${message}\n`);
  }
}

function requestId(id: unknown): number | string | undefined {
  return typeof id === "number" || typeof id === "string" ? id : undefined;
}

function applyContentChange(text: string, change: ContentChange): string {
  if (!change.range) return change.text;
  const start = offsetAt(text, change.range.start);
  const end = offsetAt(text, change.range.end);
  if (end < start) throw new Error("invalid LSP content change range");
  return text.slice(0, start) + change.text + text.slice(end);
}

function offsetAt(text: string, position: Position): number {
  if (position.line < 0 || position.character < 0) throw new Error("invalid negative LSP position");
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < text.length && line < position.line; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  if (line !== position.line) throw new Error(`LSP line out of range: ${position.line}`);
  return Math.min(text.length, lineStart + position.character);
}

function filePathFromUri(uri: string): string | undefined {
  if (!uri.startsWith("file:")) return undefined;
  try {
    return fileURLToPath(uri);
  } catch {
    return undefined;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
