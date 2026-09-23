import { parentPort } from "node:worker_threads";
import * as languageService from "@proofscript/language-service";
import type {
  CancellationToken,
  TextDocumentContentChange,
} from "@proofscript/language-service";

const { ProofScriptLanguageService, CancelledError } = languageService;

if (!parentPort) throw new Error("ProofScript language worker must run in a worker thread");

interface WorkerRequest {
  readonly kind: "request";
  readonly seq: number;
  readonly operation: string;
  readonly args?: any;
  readonly cancelBuffer?: SharedArrayBuffer;
}
interface WorkerMutation {
  readonly kind: "mutation";
  readonly operation: string;
  readonly args?: any;
}
interface WorkerInit {
  readonly kind: "init";
  readonly documents?: readonly {
    readonly uri: string;
    readonly version: number;
    readonly text: string;
    readonly filePath?: string;
  }[];
}
type WorkerMessage = WorkerRequest | WorkerMutation | WorkerInit;

let service = new ProofScriptLanguageService();
let initialized = false;

parentPort.on("message", (message: WorkerMessage) => {
  try {
    if (message.kind === "init") {
      service = new ProofScriptLanguageService();
      for (const document of message.documents ?? []) {
        service.openDocument(document.uri, document.version, document.text, document.filePath);
      }
      initialized = true;
      parentPort!.postMessage({ kind: "ready" });
      return;
    }

    if (!initialized) throw new Error("language worker has not been initialized");

    if (message.kind === "mutation") {
      applyMutation(message.operation, message.args);
      return;
    }

    const cancellation = cancellationTokenFromBuffer(message.cancelBuffer);
    parentPort!.postMessage({ kind: "requestStarted", seq: message.seq });
    cancellation?.throwIfCancellationRequested();
    const result = dispatch(message.operation, message.args, cancellation);
    parentPort!.postMessage({ kind: "response", seq: message.seq, result });
  } catch (error) {
    if (message.kind === "request") {
      parentPort!.postMessage({ kind: "response", seq: message.seq, error: serializeError(error) });
    } else {
      parentPort!.postMessage({ kind: "workerError", error: serializeError(error) });
    }
  }
});

function applyMutation(operation: string, args: any): void {
  switch (operation) {
    case "openDocument":
      service.openDocument(args.uri, args.version, args.text, args.filePath);
      return;
    case "updateDocument":
      service.updateDocument(args.uri, args.version, args.changes as readonly TextDocumentContentChange[]);
      return;
    case "replaceDocument":
      service.replaceDocument(args.uri, args.version, args.text);
      return;
    case "closeDocument":
      service.closeDocument(args.uri);
      return;
    default:
      throw new Error(`unknown language-worker mutation: ${operation}`);
  }
}

function dispatch(operation: string, args: any, cancellation?: CancellationToken): any {
  switch (operation) {
    case "ping":
      return { ok: true, pid: process.pid };
    case "analyze":
      return service.analyze(args.uri, false, cancellation);
    case "diagnostics":
      return service.diagnostics(args.uri, cancellation);
    case "documentSymbols":
      return service.documentSymbols(args.uri, cancellation);
    case "hover":
      return service.hover(args.uri, args.position, cancellation);
    case "completion":
      return service.completion(args.uri, args.position, cancellation);
    case "semanticTokens":
      return service.semanticTokens(args.uri, cancellation);
    case "formatDocument":
      return service.formatDocument(args.uri, cancellation);
    case "goals":
      return service.goals(args.uri, args.position, cancellation);
    case "definition":
      return service.definition(args.uri, args.position, cancellation);
    case "references":
      return service.references(args.uri, args.position, args.includeDeclaration !== false, cancellation);
    case "rename":
      return service.rename(args.uri, args.position, args.newName, cancellation);
    case "__debugBlock":
      return debugBlock(args?.ms, cancellation);
    default:
      throw new Error(`unknown language-worker request: ${operation}`);
  }
}

function debugBlock(ms: unknown, cancellation?: CancellationToken): any {
  if (process.env.PROOFSCRIPT_WORKER_TESTING !== "1") throw new Error("debug worker operation disabled");
  const duration = Math.max(0, Math.min(1000, typeof ms === "number" ? ms : 100));
  const started = Date.now();
  let polls = 0;
  while (Date.now() - started < duration) {
    if (((++polls) & 4095) === 0) cancellation?.throwIfCancellationRequested();
  }
  return { ok: true, durationMs: Date.now() - started };
}

function cancellationTokenFromBuffer(buffer: SharedArrayBuffer | undefined): CancellationToken | undefined {
  if (!buffer) return undefined;
  const flag = new Int32Array(buffer);
  return {
    get isCancellationRequested() {
      return Atomics.load(flag, 0) !== 0;
    },
    throwIfCancellationRequested() {
      if (Atomics.load(flag, 0) !== 0) throw new CancelledError();
    },
  };
}

function serializeError(error: unknown): any {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack };
  return { name: "Error", message: String(error) };
}
