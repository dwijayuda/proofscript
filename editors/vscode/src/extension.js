const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const EXPECTED_LSP_PROTOCOL_VERSION = 1;
let client;
let diagnostics;
let output;
let infoview;
let statusBar;
let selectionTimer;
let infoviewGeneration = 0;
const lastStatusByUri = new Map();

class RpcClient {
  constructor(outputChannel, extensionPath) {
    this.output = outputChannel;
    this.extensionPath = extensionPath;
    this.proc = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
    this.notifications = new Map();
    this.ready = false;
  }
  async start() {
    const failures = [];
    for (const candidate of this.launchCandidates()) {
      try { await this.startCandidate(candidate); return; }
      catch (error) { failures.push(candidate.label + ": " + messageOf(error)); this.abortCandidate(); }
    }
    throw new Error("No usable ProofScript LSP could be started.\n" + failures.join("\n"));
  }
  launchCandidates() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const configured = vscode.workspace.getConfiguration("proofscript").get("lsp.path");
    if (configured) {
      const resolved = path.isAbsolute(configured) ? configured : path.resolve(root, configured);
      if (resolved.endsWith(".js") || resolved.endsWith(".mjs")) {
        if (!fs.existsSync(resolved)) throw new Error("Configured ProofScript LSP was not found: " + resolved);
        return [this.nodeLaunch(resolved, "configured ProofScript LSP", root)];
      }
      return [{ label: "configured ProofScript LSP", command: fs.existsSync(resolved) ? resolved : configured, args: [], cwd: root, shell: process.platform === "win32" && !fs.existsSync(resolved), env: process.env }];
    }
    const bundled = path.join(this.extensionPath, "server", "run-lsp.mjs");
    if (!fs.existsSync(bundled)) throw new Error("ProofScript LSP launcher is missing: " + bundled);
    return [this.nodeLaunch(bundled, "ProofScript repository LSP", root)];
  }
  nodeLaunch(script, label, cwd) {
    if (commandExists("node")) return { label, command: "node", args: [script], cwd, env: process.env };
    return { label, command: process.execPath, args: [script], cwd, env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } };
  }
  async startCandidate(launch) {
    this.output.appendLine("Starting ProofScript LSP (" + launch.label + "): " + launch.command + " " + launch.args.join(" "));
    const proc = cp.spawn(launch.command, launch.args, { cwd: launch.cwd, env: launch.env, stdio: ["pipe","pipe","pipe"], windowsHide: true, shell: launch.shell === true });
    this.proc = proc;
    proc.stdout.on("data", (chunk) => { if (this.proc !== proc) return; this.buffer = Buffer.concat([this.buffer, chunk]); this.drain(); });
    proc.stderr.on("data", (chunk) => { if (this.proc === proc) this.output.append(chunk.toString()); });
    proc.on("error", (error) => this.failProcess(proc, error));
    proc.on("exit", (code, signal) => { if (this.proc === proc) this.failProcess(proc, new Error("ProofScript LSP exited (" + (code ?? signal) + ")")); });
    const initialize = await withTimeout(this.request("initialize", {
      processId: process.pid,
      rootUri: vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? null,
      workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map((folder) => ({ uri: folder.uri.toString(), name: folder.name })),
      capabilities: { general: { positionEncodings: ["utf-16"] }, textDocument: { diagnostic: { dynamicRegistration: false } } },
    }), 7000, "Timed out initializing " + launch.label);
    validateProtocol(initialize, launch.label);
    this.capabilities = initialize.capabilities ?? {};
    this.experimental = initialize.experimental?.proofscript ?? {};
    this.sendNotification("initialized", {});
    this.ready = true;
    this.output.appendLine("ProofScript LSP ready (" + launch.label + ", protocol v" + this.experimental.protocolVersion + ").");
  }
  failProcess(proc, error) {
    if (this.proc !== proc) return;
    this.ready = false;
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    this.output.appendLine(messageOf(error));
  }
  abortCandidate() {
    const proc = this.proc;
    this.proc = null;
    this.ready = false;
    for (const pending of this.pending.values()) pending.reject(new Error("ProofScript LSP candidate abandoned"));
    this.pending.clear();
    if (proc && !proc.killed) try { proc.kill(); } catch {}
  }
  drain() {
    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd < 0) return;
      const header = this.buffer.slice(0, headerEnd).toString();
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) { this.buffer = this.buffer.slice(headerEnd + 4); continue; }
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (this.buffer.length < bodyStart + length) return;
      const message = JSON.parse(this.buffer.slice(bodyStart, bodyStart + length).toString());
      this.buffer = this.buffer.slice(bodyStart + length);
      this.trace("←", message);
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          pending.cancelDisposable?.dispose?.();
          message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
        }
      } else if (message.method) {
        for (const listener of this.notifications.get(message.method) ?? []) listener(message.params);
      }
    }
  }
  request(method, params, token) {
    if (!this.proc) throw new Error("ProofScript LSP is not running");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      if (token?.isCancellationRequested) return reject(new vscode.CancellationError());
      let cancelDisposable;
      if (token?.onCancellationRequested) cancelDisposable = token.onCancellationRequested(() => {
        if (!this.pending.has(id)) return;
        try { this.sendNotification("$/cancelRequest", { id }); } catch {}
        this.pending.delete(id);
        cancelDisposable?.dispose?.();
        reject(new vscode.CancellationError());
      });
      this.pending.set(id, { resolve, reject, cancelDisposable });
      try { this.send({ jsonrpc: "2.0", id, method, params }); }
      catch (error) { this.pending.delete(id); cancelDisposable?.dispose?.(); reject(error); }
    });
  }
  sendNotification(method, params) { if (this.proc) this.send({ jsonrpc: "2.0", method, params }); }
  send(message) {
    if (!this.proc?.stdin?.writable) throw new Error("ProofScript LSP stdin is not writable");
    this.trace("→", message);
    const body = JSON.stringify(message);
    this.proc.stdin.write("Content-Length: " + Buffer.byteLength(body) + "\r\n\r\n" + body);
  }
  on(method, listener) {
    const list = this.notifications.get(method) ?? [];
    list.push(listener);
    this.notifications.set(method, list);
    return { dispose: () => this.notifications.set(method, (this.notifications.get(method) ?? []).filter((item) => item !== listener)) };
  }
  trace(direction, message) {
    if (vscode.workspace.getConfiguration("proofscript").get("trace.server") === "messages") this.output.appendLine(direction + " " + JSON.stringify(message));
  }
  async stop() {
    if (!this.proc) return;
    const proc = this.proc;
    try { await Promise.race([this.request("shutdown", {}), new Promise((resolve) => setTimeout(resolve, 500))]); this.sendNotification("exit", {}); } catch {}
    setTimeout(() => { if (this.proc === proc) try { proc.kill(); } catch {} }, 300);
    this.proc = null;
    this.ready = false;
  }
}

class InfoviewProvider {
  constructor() { this.view = null; this.status = null; this.semantic = null; this.meta = { serverReady: false }; }
  resolveWebviewView(view) { this.view = view; view.webview.options = { enableScripts: false }; this.render(); }
  update(status, semantic, meta = {}) { this.status = status; this.semantic = semantic; this.meta = { ...this.meta, ...meta }; this.render(); }
  setServerReady(ready, message) { this.meta = { ...this.meta, serverReady: ready, serverMessage: message ?? null }; this.render(); }
  render() {
    if (!this.view) return;
    const status = this.status;
    const semantic = this.semantic;
    const allDiagnostics = semantic?.allDiagnostics ?? [];
    const features = semantic?.surfaceFeatures ?? [];
    const symbol = semantic?.symbol;
    const state = status?.status ?? (this.meta.serverReady ? "ready" : "starting");
    const symbolHtml = symbol ? "<h3>Symbol</h3><pre>" + escapeHtml((symbol.qualifiedName || symbol.name) + " : " + symbol.type) + "</pre><div>" + escapeHtml(symbol.kind) + "</div>" : "<p>No declaration symbol at the cursor.</p>";
    const assumptions = status?.assumptions?.length ? "<details><summary>Assumptions (" + status.assumptions.length + ")</summary><pre>" + escapeHtml(status.assumptions.join("\n")) + "</pre></details>" : "";
    const featureHtml = features.length ? "<h3>Surface features</h3><ul>" + features.map((item) => "<li><code>" + escapeHtml(item.feature) + "</code></li>").join("") + "</ul>" : "";
    const diagnosticHtml = allDiagnostics.length ? allDiagnostics.map((item) => "<div class=\"diagnostic\">" + escapeHtml(item.message) + "</div>").join("") : "<p>None.</p>";
    this.view.webview.html = "<!doctype html><html><head><style>body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:10px;line-height:1.45}h2,h3{margin:10px 0 6px}pre,code{font-family:var(--vscode-editor-font-family)}pre{white-space:pre-wrap;background:var(--vscode-textCodeBlock-background);padding:8px;border-radius:4px}.diagnostic{padding:6px 0;border-bottom:1px solid var(--vscode-panel-border)}</style></head><body><h2>ProofScript</h2><strong>" + escapeHtml(state) + "</strong>" + symbolHtml + "<h3>Document</h3><div>" + (status?.declarations ?? 0) + " declaration(s), " + (status?.diagnostics ?? allDiagnostics.length) + " diagnostic(s)</div>" + assumptions + featureHtml + "<h3>Diagnostics</h3>" + diagnosticHtml + "<details><summary>Trust boundary</summary><p>Compiler-backed document semantics. Protocol v1 does not expose tactic-state snapshots, so the editor does not fabricate proof goals.</p></details></body></html>";
  }
}

async function activate(context) {
  output = vscode.window.createOutputChannel("ProofScript");
  diagnostics = vscode.languages.createDiagnosticCollection("proofscript");
  infoview = new InfoviewProvider();
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 85);
  statusBar.name = "ProofScript Status";
  statusBar.command = "proofscript.showInfoview";
  statusBar.text = "$(loading~spin) ProofScript";
  context.subscriptions.push(output, diagnostics, statusBar, vscode.window.registerWebviewViewProvider("proofscript.infoview", infoview));
  registerCommands(context);
  registerLanguageProviders(context);
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => { if (document.languageId === "proofscript") didOpen(document); }),
    vscode.workspace.onDidChangeTextDocument((event) => { if (event.document.languageId === "proofscript") didChange(event); }),
    vscode.workspace.onDidCloseTextDocument((document) => { if (document.languageId === "proofscript") didClose(document); }),
    vscode.window.onDidChangeTextEditorSelection(() => scheduleInfoviewUpdate()),
    vscode.window.onDidChangeActiveTextEditor(() => { updateStatusBarVisibility(); scheduleInfoviewUpdate(); }),
  );
  updateStatusBarVisibility();
  await startClient(context);
  for (const document of vscode.workspace.textDocuments) if (document.languageId === "proofscript") didOpen(document);
  scheduleInfoviewUpdate();
}

async function startClient(context) {
  infoview.setServerReady(false, "Starting language server");
  const next = new RpcClient(output, context.extensionPath);
  try {
    await next.start();
    client = next;
    context.subscriptions.push(
      next.on("textDocument/publishDiagnostics", publishDiagnostics),
      next.on("proofscript/documentStatusChanged", (params) => { if (params?.uri && params?.status) lastStatusByUri.set(params.uri, params.status); updateStatusBar(params?.status); scheduleInfoviewUpdate(); }),
      next.on("proofscript/documentProcessing", (params) => { const active = vscode.window.activeTextEditor?.document.uri.toString(); if (params?.uri === active && params.processing) { statusBar.text = "$(loading~spin) ProofScript"; statusBar.tooltip = "Checking current document"; } }),
    );
    infoview.setServerReady(true);
    updateStatusBar(lastStatusByUri.get(vscode.window.activeTextEditor?.document.uri.toString()));
  } catch (error) {
    client = next;
    const message = messageOf(error);
    output.appendLine(message);
    infoview.setServerReady(false, message);
    vscode.window.showErrorMessage("ProofScript language server failed to start: " + message, "Show Output").then((choice) => { if (choice) output.show(true); });
  }
}

function registerLanguageProviders(context) {
  const selector = { language: "proofscript" };
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, { provideHover: async (document, position, token) => {
    if (!client?.ready || client.capabilities?.hoverProvider !== true) return null;
    const result = await client.request("textDocument/hover", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
    if (!result) return null;
    return new vscode.Hover(new vscode.MarkdownString(result.contents?.value ?? String(result.contents ?? "")), result.range ? toRange(result.range) : undefined);
  }}));
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, { provideDocumentSymbols: async (document, token) => {
    if (!client?.ready || client.capabilities?.documentSymbolProvider !== true) return [];
    const result = await client.request("textDocument/documentSymbol", { textDocument: { uri: document.uri.toString() } }, token);
    return (result ?? []).map((item) => new vscode.DocumentSymbol(item.name, item.detail ?? "", mapSymbolKind(item.kind), toRange(item.range), toRange(item.selectionRange)));
  }}));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, {
    provideCompletionItems: async (document, position, token) => {
      if (!client?.ready || !client.capabilities?.completionProvider) return [];
      const result = await client.request("textDocument/completion", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      return (result?.items ?? []).map((item) => {
        const completion = new vscode.CompletionItem(item.label, mapCompletionKind(item.kind));
        completion.detail = item.detail;
        completion.sortText = item.sortText;
        return completion;
      });
    },
  }, "."));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
    provideDefinition: async (document, position, token) => {
      if (!client?.ready || client.capabilities?.definitionProvider !== true) return null;
      const result = await client.request("textDocument/definition", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      return result ? new vscode.Location(vscode.Uri.parse(result.uri), toRange(result.range)) : null;
    },
  }));
  context.subscriptions.push(vscode.languages.registerReferenceProvider(selector, {
    provideReferences: async (document, position, context, token) => {
      if (!client?.ready || client.capabilities?.referencesProvider !== true) return [];
      const result = await client.request("textDocument/references", {
        textDocument: { uri: document.uri.toString() },
        position: toPos(position),
        context: { includeDeclaration: context.includeDeclaration },
      }, token);
      return (result ?? []).map((item) => new vscode.Location(vscode.Uri.parse(item.uri), toRange(item.range)));
    },
  }));
  context.subscriptions.push(vscode.languages.registerRenameProvider(selector, {
    provideRenameEdits: async (document, position, newName, token) => {
      if (!client?.ready || client.capabilities?.renameProvider !== true) return null;
      const result = await client.request("textDocument/rename", {
        textDocument: { uri: document.uri.toString() },
        position: toPos(position),
        newName,
      }, token);
      const edit = new vscode.WorkspaceEdit();
      for (const [uri, edits] of Object.entries(result?.changes ?? {})) {
        for (const item of edits) edit.replace(vscode.Uri.parse(uri), toRange(item.range), item.newText);
      }
      return edit;
    },
  }));
}

function registerCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("proofscript.restartServer", async () => { await client?.stop(); diagnostics.clear(); await startClient(context); for (const document of vscode.workspace.textDocuments) if (document.languageId === "proofscript") didOpen(document); scheduleInfoviewUpdate(); }),
    vscode.commands.registerCommand("proofscript.showInfoview", async () => { await vscode.commands.executeCommand("proofscript.infoview.focus"); scheduleInfoviewUpdate(); }),
    vscode.commands.registerCommand("proofscript.serverInfo", async () => { if (!client?.ready) return; const info = await client.request("proofscript/serverInfo", {}); output.appendLine(JSON.stringify(info, null, 2)); output.show(true); }),
    vscode.commands.registerCommand("proofscript.showDocumentStatus", async () => { const editor = activeEditor(); if (!editor || !client?.ready) return; const status = await client.request("proofscript/documentStatus", { textDocument: { uri: editor.document.uri.toString() } }); lastStatusByUri.set(editor.document.uri.toString(), status); output.appendLine(JSON.stringify(status, null, 2)); output.show(true); }),
    vscode.commands.registerCommand("proofscript.showOutput", () => output.show(true)),
  );
}

function didOpen(document) { if (client?.ready) client.sendNotification("textDocument/didOpen", { textDocument: { uri: document.uri.toString(), languageId: "proofscript", version: document.version, text: document.getText() } }); }
function didChange(event) {
  if (!client?.ready) return;
  const changes = (event.contentChanges ?? []).map((change) => ({ range: toPlainRange(change.range), rangeLength: change.rangeLength, text: change.text }));
  if (changes.length) client.sendNotification("textDocument/didChange", { textDocument: { uri: event.document.uri.toString(), version: event.document.version }, contentChanges: changes });
}
function didClose(document) { lastStatusByUri.delete(document.uri.toString()); diagnostics.delete(document.uri); if (client?.ready) client.sendNotification("textDocument/didClose", { textDocument: { uri: document.uri.toString() } }); }

function publishDiagnostics(params) {
  const uri = vscode.Uri.parse(params.uri);
  const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === params.uri);
  if (Number.isInteger(params.version) && open && params.version < open.version) { output.appendLine("Ignoring stale diagnostics for " + params.uri + ": server v" + params.version + ", editor v" + open.version); return; }
  diagnostics.set(uri, (params.diagnostics ?? []).map((item) => { const diagnostic = new vscode.Diagnostic(toRange(item.range), item.message, toSeverity(item.severity)); diagnostic.code = item.code; diagnostic.source = item.source; return diagnostic; }));
  scheduleInfoviewUpdate();
}
function scheduleInfoviewUpdate() {
  clearTimeout(selectionTimer);
  const delay = Math.max(0, Number(vscode.workspace.getConfiguration("proofscript").get("infoview.debounceTime", 60)) || 0);
  selectionTimer = setTimeout(updateInfoview, delay);
}
async function updateInfoview() {
  const generation = ++infoviewGeneration;
  const editor = activeEditor();
  if (!editor) { infoview.update(null, null, { serverReady: !!client?.ready }); updateStatusBarVisibility(); return; }
  if (!client?.ready) { infoview.update(null, null, { serverReady: false }); return; }
  const uri = editor.document.uri.toString();
  const version = editor.document.version;
  const position = toPos(editor.selection.active);
  try {
    const values = await Promise.all([
      client.request("proofscript/documentStatus", { textDocument: { uri } }),
      client.request("proofscript/semanticInfo", { textDocument: { uri }, position }),
    ]);
    const status = values[0], semantic = values[1], current = activeEditor();
    if (generation !== infoviewGeneration || !current || current.document.uri.toString() !== uri || current.document.version !== version) return;
    lastStatusByUri.set(uri, status);
    infoview.update(status, semantic, { serverReady: true });
    updateStatusBar(status);
  } catch (error) {
    if (generation === infoviewGeneration) infoview.update(lastStatusByUri.get(uri) ?? null, { allDiagnostics: [{ message: messageOf(error) }] }, { serverReady: true });
  }
}

function updateStatusBarVisibility() { if (activeEditor()) statusBar?.show(); else statusBar?.hide(); }
function updateStatusBar(status) {
  if (!statusBar) return;
  updateStatusBarVisibility();
  if (!client?.ready) { statusBar.text = "$(circle-slash) ProofScript"; statusBar.tooltip = "Language server unavailable"; return; }
  const state = status?.status ?? "ready";
  statusBar.text = state === "accepted" ? "$(check) ProofScript" : state === "unsupported" ? "$(warning) ProofScript" : "$(error) ProofScript";
  statusBar.tooltip = "ProofScript: " + state + (Number.isInteger(status?.diagnostics) ? " — " + status.diagnostics + " diagnostic(s)" : "");
}
function activeEditor() { const editor = vscode.window.activeTextEditor; return editor?.document.languageId === "proofscript" ? editor : null; }
function validateProtocol(initialize, label) { const version = initialize?.experimental?.proofscript?.protocolVersion; if (version !== EXPECTED_LSP_PROTOCOL_VERSION) throw new Error("ProofScript LSP protocol mismatch: editor expects v" + EXPECTED_LSP_PROTOCOL_VERSION + ", " + label + " reported " + (version ?? "missing")); }
function commandExists(command) { const checker = process.platform === "win32" ? "where" : "which"; return cp.spawnSync(checker, [command], { stdio: "ignore", windowsHide: true }).status === 0; }
function withTimeout(promise, ms, message) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]); }
function toPos(position) { return { line: position.line, character: position.character }; }
function toPlainRange(range) { return { start: toPos(range.start), end: toPos(range.end) }; }
function toRange(range) { return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character); }
function toSeverity(severity) { return severity === 2 ? vscode.DiagnosticSeverity.Warning : severity === 3 ? vscode.DiagnosticSeverity.Information : severity === 4 ? vscode.DiagnosticSeverity.Hint : vscode.DiagnosticSeverity.Error; }
function mapCompletionKind(kind) { return Number.isInteger(kind) ? kind : vscode.CompletionItemKind.Text; }
function mapSymbolKind(kind) { return Number.isInteger(kind) ? kind : vscode.SymbolKind.Variable; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"\']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "\'":"&#39;" }[char])); }
function messageOf(error) { return error instanceof Error ? error.message : String(error); }
async function deactivate() { await client?.stop(); }
module.exports = { activate, deactivate };
