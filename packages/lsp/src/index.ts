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
              hoverProvider: true,
              documentSymbolProvider: true,
              completionProvider: {
                resolveProvider: false,
                triggerCharacters: ["."],
              },
              definitionProvider: true,
              referencesProvider: true,
              renameProvider: true,
              documentFormattingProvider: true,
              codeActionProvider: {
                codeActionKinds: ["quickfix", "source.format.proofscript"],
              },
              semanticTokensProvider: {
                legend: {
                  tokenTypes: ["function", "enum", "struct", "class", "variable"],
                  tokenModifiers: ["declaration", "definition", "readonly"],
                },
                full: true,
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
                surfaceFeatureRequest: "proofscript/surfaceFeatures",
                documentStatusRequest: "proofscript/documentStatus",
                semanticInfoRequest: "proofscript/semanticInfo",
                serverInfoRequest: "proofscript/serverInfo",
                goalsRequest: "proofscript/goals",
                goalPresentationAvailable: true,
                proofStateAvailable: false,
                editorFeatureLevel: "document-semantic0",
                declarationSourceIndex: true,
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

        case "proofscript/serverInfo": {
          return this.reply(message.id, {
            protocolVersion: 1,
            serverVersion: "0.1.0-dev.0",
            architecture: "compiler -> language-service -> language-worker -> lsp",
            compilerBacked: true,
            duplicateParser: false,
            proofStateAvailable: false,
            editorFeatureLevel: "document-semantic0",
            worker: this.worker.stats(),
          });
        }

        case "proofscript/documentStatus": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const analysis = await this.worker.analyze(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version || latest.version !== analysis.version) {
              return this.error(message.id, -32801, "document changed while document status was running");
            }
            return this.reply(message.id, documentStatusFromAnalysis(analysis));
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "proofscript/semanticInfo": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const analysis = await this.worker.analyze(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version || latest.version !== analysis.version) {
              return this.error(message.id, -32801, "document changed while semantic info was running");
            }
            const offset = offsetAt(before.text, position);
            const declaration = analysis.sourceDeclarations.find((item: any) =>
              offset >= item.startOffset && offset < item.endOffset
            ) ?? null;
            const symbol = analysis.sourceDeclarations.find((item: any) =>
              offset >= item.nameStartOffset && offset < item.nameEndOffset
            ) ?? declaration;
            const features = analysis.surfaceFeatures.filter((item: any) =>
              offset >= item.startOffset && offset < item.endOffset
            );
            const diagnostics = analysis.diagnostics.filter((item: any) => positionInRange(position, item.range));
            return this.reply(message.id, {
              uri,
              version: analysis.version,
              generation: analysis.generation,
              resultId: analysis.resultId,
              status: analysis.status,
              symbol: symbol ? {
                name: symbol.name,
                qualifiedName: symbol.qualifiedName,
                kind: symbol.kind,
                type: symbol.type,
                range: symbol.selectionRange,
              } : null,
              declaration: declaration ? {
                name: declaration.name,
                qualifiedName: declaration.qualifiedName,
                kind: declaration.kind,
                type: declaration.type,
                range: declaration.range,
                selectionRange: declaration.selectionRange,
              } : null,
              surfaceFeatures: features,
              diagnostics,
              allDiagnostics: analysis.diagnostics,
              assumptions: analysis.assumptions,
              proofStateAvailable: false,
            });
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "proofscript/goals": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (
            position !== undefined
            && (!position || typeof position.line !== "number" || typeof position.character !== "number")
          ) {
            return this.error(message.id, -32602, "invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const goals = await this.worker.goals(uri, position, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version || goals.version !== before.version) {
              return this.error(message.id, -32801, "document changed while proof goals were running");
            }
            return this.reply(message.id, goals);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "proofscript/surfaceFeatures": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const analysis = await this.worker.analyze(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version || latest.version !== analysis.version) {
              return this.error(message.id, -32801, "document changed while surface features were running");
            }
            return this.reply(message.id, {
              version: analysis.version,
              resultId: analysis.resultId,
              features: analysis.surfaceFeatures,
            });
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) {
              return this.error(message.id, -32800, "request cancelled");
            }
            throw error;
          }
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

        case "textDocument/documentSymbol": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const symbols = await this.worker.documentSymbols(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while document symbols were running");
            }
            return this.reply(message.id, symbols.map((symbol) => ({
              name: symbol.name,
              detail: symbol.detail,
              kind: lspSymbolKind(symbol.kind),
              range: symbol.range,
              selectionRange: symbol.selectionRange,
            })));
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) {
              return this.error(message.id, -32800, "request cancelled");
            }
            throw error;
          }
        }

        case "textDocument/completion": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const items = await this.worker.completion(uri, position, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while completion was running");
            }
            return this.reply(message.id, {
              isIncomplete: false,
              items: items.map((item) => ({
                label: item.label,
                detail: item.qualifiedName === item.label
                  ? item.detail
                  : `${item.qualifiedName} : ${item.detail}`,
                kind: lspCompletionKind(item.kind),
                sortText: item.sortText,
              })),
            });
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "textDocument/codeAction": {
          const uri = message.params?.textDocument?.uri;
          const range = message.params?.range;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (
            !range
            || typeof range.start?.line !== "number"
            || typeof range.start?.character !== "number"
            || typeof range.end?.line !== "number"
            || typeof range.end?.character !== "number"
          ) {
            return this.error(message.id, -32602, "missing or invalid range");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const actions = await this.worker.codeActions(uri, range, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while code actions were running");
            }
            return this.reply(message.id, actions);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            return this.error(message.id, -32602, messageOf(error));
          }
        }

        case "textDocument/formatting": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const edits = await this.worker.formatDocument(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while formatting was running");
            }
            return this.reply(message.id, edits);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            return this.error(message.id, -32602, messageOf(error));
          }
        }

        case "textDocument/semanticTokens/full": {
          const uri = message.params?.textDocument?.uri;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const tokens = await this.worker.semanticTokens(uri, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while semantic tokens were running");
            }
            return this.reply(message.id, {
              resultId: `${uri}@${latest.version}`,
              data: encodeSemanticTokens(tokens),
            });
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "textDocument/definition": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const location = await this.worker.definition(uri, position, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while definition was running");
            }
            return this.reply(message.id, location);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "textDocument/references": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const locations = await this.worker.references(
              uri,
              position,
              message.params?.context?.includeDeclaration !== false,
              ownerId,
            );
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while references was running");
            }
            return this.reply(message.id, locations);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            throw error;
          }
        }

        case "textDocument/rename": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          const newName = message.params?.newName;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          if (typeof newName !== "string") return this.error(message.id, -32602, "missing newName");
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const edit = await this.worker.rename(uri, position, newName, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while rename was running");
            }
            return this.reply(message.id, edit);
          } catch (error) {
            if (error instanceof LanguageWorkerCancelledError) return this.error(message.id, -32800, "request cancelled");
            return this.error(message.id, -32602, error instanceof Error ? error.message : String(error));
          }
        }

        case "textDocument/hover": {
          const uri = message.params?.textDocument?.uri;
          const position = message.params?.position;
          if (typeof uri !== "string") return this.error(message.id, -32602, "missing textDocument.uri");
          if (!position || typeof position.line !== "number" || typeof position.character !== "number") {
            return this.error(message.id, -32602, "missing or invalid position");
          }
          const before = this.documents.get(uri);
          if (!before) return this.error(message.id, -32602, `document is not open: ${uri}`);
          const ownerId = requestId(message.id);
          try {
            const hover = await this.worker.hover(uri, position, ownerId);
            const latest = this.documents.get(uri);
            if (!latest || latest.version !== before.version) {
              return this.error(message.id, -32801, "document changed while hover was running");
            }
            if (!hover) return this.reply(message.id, null);
            const displayName = hover.qualifiedName || hover.name;
            return this.reply(message.id, {
              contents: {
                kind: "markdown",
                value: `\`\`\`proofscript\n${displayName} : ${hover.type}\n\`\`\`\n\n${hover.kind}`,
              },
              range: hover.range,
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
    this.notify("proofscript/documentProcessing", { uri, version, processing: true });
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
      const analysis = await this.worker.analyze(uri, owner);
      const current = this.documents.get(uri);
      if (current && current.version === version && analysis.version === version) {
        this.notify("proofscript/documentStatusChanged", {
          uri,
          version,
          generation: analysis.generation,
          status: documentStatusFromAnalysis(analysis),
        });
      }
    } catch (error) {
      if (!(error instanceof LanguageWorkerCancelledError)) {
        this.log(`diagnostics ${uri}: ${messageOf(error)}`);
      }
    } finally {
      this.notify("proofscript/documentProcessing", { uri, version, processing: false });
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
    process.stdout.write(`Content-Length: ${(Buffer as any).byteLength(body, "utf8")}\r\n\r\n${body}`);
  }

  private log(message: string): void {
    process.stderr.write(`[proofscript-lsp] ${message}\n`);
  }
}

function documentStatusFromAnalysis(analysis: any): any {
  const declarations = Array.isArray(analysis.sourceDeclarations)
    ? analysis.sourceDeclarations.length
    : Array.isArray(analysis.declarations) ? analysis.declarations.length : 0;
  return {
    uri: analysis.uri,
    version: analysis.version,
    generation: analysis.generation,
    resultId: analysis.resultId,
    status: analysis.status,
    frontend: analysis.status,
    declarations,
    assumptions: [...(analysis.assumptions ?? [])],
    diagnostics: analysis.diagnostics?.length ?? 0,
    message: analysis.diagnostics?.[0]?.message ?? null,
    compilerBacked: true,
    kernelStatus: analysis.status === "accepted" ? "checked-document" : "not-checked",
    proofStateAvailable: false,
  };
}

function positionInRange(position: Position, range: Range): boolean {
  const afterStart = position.line > range.start.line
    || (position.line === range.start.line && position.character >= range.start.character);
  const beforeEnd = position.line < range.end.line
    || (position.line === range.end.line && position.character <= range.end.character);
  return afterStart && beforeEnd;
}

const SEMANTIC_TOKEN_TYPES = ["function", "enum", "struct", "class", "variable"] as const;
const SEMANTIC_TOKEN_MODIFIERS = ["declaration", "definition", "readonly"] as const;

function encodeSemanticTokens(tokens: readonly any[]): number[] {
  const sorted = [...tokens].filter((token) =>
    token?.range?.start?.line === token?.range?.end?.line
    && token.range.end.character >= token.range.start.character
  ).sort((left, right) =>
    left.range.start.line - right.range.start.line
    || left.range.start.character - right.range.start.character
    || left.range.end.character - right.range.end.character
  );

  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;
  for (const token of sorted) {
    const line = token.range.start.line;
    const character = token.range.start.character;
    const length = token.range.end.character - character;
    if (length <= 0) continue;
    const tokenType = SEMANTIC_TOKEN_TYPES.indexOf(token.kind);
    if (tokenType < 0) continue;
    let modifiers = 0;
    for (const modifier of token.modifiers ?? []) {
      const index = SEMANTIC_TOKEN_MODIFIERS.indexOf(modifier);
      if (index >= 0) modifiers |= (1 << index);
    }
    const deltaLine = line - previousLine;
    const deltaStart = deltaLine === 0 ? character - previousCharacter : character;
    data.push(deltaLine, deltaStart, length, tokenType, modifiers);
    previousLine = line;
    previousCharacter = character;
  }
  return data;
}

function lspCompletionKind(kind: string): number {
  switch (kind) {
    case "theorem":
    case "definition":
    case "equationDefinition":
    case "opaque":
    case "abbrev":
      return 3; // Function
    case "axiom":
      return 21; // Constant
    case "inductive":
      return 13; // Enum
    case "structure":
      return 22; // Struct
    case "class":
      return 7; // Class
    case "instance":
      return 6; // Variable
    default:
      return 6; // Variable
  }
}

function lspSymbolKind(kind: string): number {
  switch (kind) {
    case "theorem":
    case "definition":
    case "equationDefinition":
    case "opaque":
    case "abbrev":
      return 12; // Function
    case "axiom":
      return 14; // Constant
    case "inductive":
      return 10; // Enum
    case "structure":
      return 23; // Struct
    case "class":
      return 5; // Class
    case "instance":
      return 13; // Variable
    default:
      return 13; // Variable
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
