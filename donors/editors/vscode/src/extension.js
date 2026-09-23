const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

let client;
let diagnostics;
let output;
let infoview;
let selectionTimer;
let decorationTimer;
let infoviewRequestGeneration = 0;
let verifiedDecoration;
let theoremErrorDecoration;
let warningDecoration;
let statusBar;
const lastDocumentStatusByUri = new Map();
const disposables = [];
const EXPECTED_LSP_PROTOCOL_VERSION = 38;

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
    this.stderrTail = "";
    this.launchLabel = "";
  }

  async start() {
    const candidates = this.launchCandidates();
    const failures = [];
    for (const candidate of candidates) {
      try {
        await this.startCandidate(candidate);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${candidate.label}: ${message}`);
        this.output.appendLine(`ProofScript LSP candidate failed (${candidate.label}): ${message}`);
        this.abortCandidate();
      }
    }
    throw new Error(`No usable ProofScript LSP could be started.\n${failures.join("\n")}`);
  }

  launchCandidates() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const config = vscode.workspace.getConfiguration("proofscript");
    const configured = config.get("lsp.path");
    const args = [];
    if (!config.get("integration.coverageWarnings", false)) args.push("--no-coverage-warnings");
    if (!config.get("lint.enable", true)) args.push("--no-lint");
    if (configured) {
      const resolved = path.isAbsolute(configured) ? configured : path.resolve(root, configured);
      if (resolved.endsWith(".js") || resolved.endsWith(".mjs")) {
        if (!fs.existsSync(resolved)) throw new Error(`Configured ProofScript LSP was not found: ${resolved}`);
        return [this.nodeLaunch(resolved, args, "configured ProofScript LSP", root)];
      }
      const command = fs.existsSync(resolved) ? resolved : configured;
      return [{ label: "configured ProofScript LSP", command, args, cwd: root, shell: process.platform === "win32" && !fs.existsSync(resolved), env: process.env }];
    }
    const bundled = path.join(this.extensionPath, "server", "run-lsp.mjs");
    if (!fs.existsSync(bundled)) throw new Error(`Bundled ProofScript LSP is missing: ${bundled}`);
    return [this.nodeLaunch(bundled, args, "bundled ProofScript LSP", root)];
  }

  nodeLaunch(script, args, label, cwd) {
    if (commandExists("node")) return { label, command: "node", args: [script, ...args], cwd, env: process.env };
    return {
      label,
      command: process.execPath,
      args: [script, ...args],
      cwd,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    };
  }

  async startCandidate(launch) {
    this.buffer = Buffer.alloc(0);
    this.stderrTail = "";
    this.launchLabel = launch.label;
    this.output.appendLine(`Starting ProofScript LSP (${launch.label}): ${launch.command} ${launch.args.join(" ")}`);
    const proc = cp.spawn(launch.command, launch.args, {
      cwd: launch.cwd,
      env: launch.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: launch.shell === true,
    });
    this.proc = proc;
    proc.stdout.on("data", (chunk) => {
      if (this.proc !== proc) return;
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    proc.stderr.on("data", (chunk) => {
      if (this.proc !== proc) return;
      const text = chunk.toString();
      this.stderrTail = (this.stderrTail + text).slice(-10000);
      this.output.append(text);
    });
    proc.on("error", (error) => this.failProcess(proc, new Error(`ProofScript LSP launch failed: ${error.message}`)));
    proc.on("exit", (code, signal) => {
      if (this.proc !== proc) return;
      const suffix = this.stderrTail.trim() ? `\n${this.stderrTail.trim()}` : "";
      this.failProcess(proc, new Error(`ProofScript LSP exited (${code ?? signal})${suffix}`));
    });

    const initialize = await withTimeout(this.request("initialize", {
      processId: process.pid,
      rootUri: vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? null,
      workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map((folder) => ({ uri: folder.uri.toString(), name: folder.name })),
      capabilities: {
        general: { positionEncodings: ["utf-16"] },
        textDocument: {
          semanticTokens: { requests: { full: true }, tokenTypes: [], tokenModifiers: [] },
          diagnostic: { dynamicRegistration: false, relatedDocumentSupport: false },
        },
      },
    }), 7000, `Timed out initializing ${launch.label}`);
    if (this.proc !== proc) throw new Error(`${launch.label} exited during initialization`);
    validateProofScriptProtocol(initialize, launch.label);
    this.capabilities = initialize.capabilities;
    this.experimental = initialize.experimental?.proofscript;
    this.sendNotification("initialized", {});
    this.ready = true;
    this.output.appendLine(`ProofScript LSP ready (${launch.label}).`);
  }

  failProcess(proc, error) {
    if (this.proc !== proc) return;
    this.ready = false;
    for (const [, pending] of this.pending) { pending.cancelDisposable?.dispose?.(); pending.reject(error); }
    this.pending.clear();
    this.output.appendLine(error.message);
  }

  abortCandidate() {
    const proc = this.proc;
    this.proc = null;
    this.ready = false;
    for (const [, pending] of this.pending) { pending.cancelDisposable?.dispose?.(); pending.reject(new Error("ProofScript LSP candidate abandoned")); }
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

  request(method, params, cancellationToken) {
    if (!this.proc) throw new Error("ProofScript LSP is not running");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      if (cancellationToken?.isCancellationRequested) return reject(new vscode.CancellationError());
      let cancelDisposable;
      if (cancellationToken?.onCancellationRequested) {
        cancelDisposable = cancellationToken.onCancellationRequested(() => {
          if (!this.pending.has(id)) return;
          try { this.sendNotification("$/cancelRequest", { id }); } catch {}
          this.pending.delete(id);
          cancelDisposable?.dispose?.();
          reject(new vscode.CancellationError());
        });
      }
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
    this.proc.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }
  on(method, listener) {
    const current = this.notifications.get(method) ?? [];
    current.push(listener);
    this.notifications.set(method, current);
    return () => this.notifications.set(method, (this.notifications.get(method) ?? []).filter((item) => item !== listener));
  }
  trace(direction, message) {
    if (vscode.workspace.getConfiguration("proofscript").get("trace.server") === "messages") this.output.appendLine(`${direction} ${JSON.stringify(message)}`);
  }

  async stop() {
    if (!this.proc) return;
    const proc = this.proc;
    try {
      await Promise.race([this.request("shutdown", {}), new Promise((resolve) => setTimeout(resolve, 500))]);
      this.sendNotification("exit", {});
    } catch {}
    setTimeout(() => { if (this.proc === proc) try { proc.kill(); } catch {} }, 300);
    this.proc = null;
    this.ready = false;
  }
}

class InfoviewProvider {
  constructor(onAction) {
    this.view = null;
    this.proof = { status: "none", goals: [], messages: [] };
    this.documentStatus = null;
    this.cursorInfo = null;
    this.meta = { serverReady: false, fileName: null, line: null };
    this.onAction = onAction;
  }
  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage((message) => this.onAction?.(message));
    this.render();
  }
  update(proof, documentStatus, cursorInfo, meta = {}) {
    this.proof = proof ?? { status: "none", goals: [], messages: [] };
    this.documentStatus = documentStatus ?? null;
    this.cursorInfo = cursorInfo ?? null;
    this.meta = { ...this.meta, ...meta };
    this.render();
  }
  setServerReady(ready, message) {
    this.meta = { ...this.meta, serverReady: ready, serverMessage: message ?? null };
    this.render();
  }
  render() {
    if (!this.view) return;
    this.view.webview.html = renderInfoviewHtml(this.proof, this.documentStatus, this.cursorInfo, this.meta);
  }
  action(index) { return this.cursorInfo?.actions?.[index]; }
  diagnostic(scope, index) {
    const source = scope === "near" ? this.cursorInfo?.diagnostics : this.cursorInfo?.allDiagnostics;
    return Array.isArray(source) ? source[index] : undefined;
  }
}

function renderInfoviewHtml(proof, status, cursorInfo, meta) {
  const goals = Array.isArray(proof?.goals) ? proof.goals : [];
  const nearDiagnostics = Array.isArray(cursorInfo?.diagnostics) ? cursorInfo.diagnostics : [];
  const allDiagnosticsUnsorted = Array.isArray(cursorInfo?.allDiagnostics) ? cursorInfo.allDiagnostics : [];
  const actions = Array.isArray(cursorInfo?.actions) ? cursorInfo.actions : [];
  const hasDeclaration = !!proof?.declaration;
  const kernel = (hasDeclaration ? proof?.verification?.kernel : (cursorInfo?.symbol?.verification?.kernel ?? cursorInfo?.declaration?.verification?.kernel)) ?? status?.kernel ?? "not-run";
  const frontend = (hasDeclaration ? proof?.verification?.frontend : (cursorInfo?.symbol?.verification?.frontend ?? cursorInfo?.declaration?.verification?.frontend)) ?? status?.frontend ?? "unknown";
  const coreFormat = proof?.verification?.coreFormat ?? cursorInfo?.symbol?.verification?.coreFormat ?? status?.coreFormat ?? 68;
  const coreProfile = proof?.verification?.coreProfile ?? cursorInfo?.symbol?.verification?.coreProfile ?? status?.coreProfile ?? "KERNEL-resource-bounds0";
  const migration = proof?.verification?.migration ?? status?.migration ?? "not-run";
  const migrationProfile = proof?.verification?.migrationProfile ?? status?.migrationProfile;
  const location = meta.fileName ? `${meta.fileName}:${meta.line ?? 1}:${meta.character ?? 1}` : "ProofScript";
  const currentLine = Math.max(0, (meta.line ?? 1) - 1);
  const allDiagnostics = [...allDiagnosticsUnsorted].sort((a, b) => distanceToLine(a, currentLine) - distanceToLine(b, currentLine) || diagnosticLine(a) - diagnosticLine(b));
  const lintDiagnostics = allDiagnostics.filter((item) => String(item.code ?? "").startsWith("PSL"));
  const compilerDiagnostics = allDiagnostics.filter((item) => !String(item.code ?? "").startsWith("PSL"));

  const symbol = cursorInfo?.symbol;
  const symbolHtml = symbol
    ? `<details open><summary>${symbol.kind === "parameter" || symbol.kind === "builtin" ? "Type" : "At cursor"}</summary><div class="symbol-card"><div class="symbol-head"><span class="symbol-kind">${escapeHtml(symbol.kind ?? "symbol")}</span><strong>${escapeHtml(symbol.name ?? "")}</strong>${symbol.verification?.kernel === "verified" ? `<span class="badge checked">✓ checked</span>` : ""}</div><code class="signature">${escapeHtml(symbol.signature ?? symbol.name ?? "")}</code><div class="micro-actions"><button data-action="copy-symbol">Copy</button></div></div></details>`
    : "";

  const expectedType = cursorInfo?.expectedType ?? proof?.expectedType;
  const expectedTypeLabel = cursorInfo?.expectedTypeKind === "declaration-result" ? "Result type" : "Expected type";
  const expectedTypeHtml = expectedType
    ? `<details open><summary>${expectedTypeLabel}</summary><div class="expected"><span class="turnstile">⊢</span><code>${escapeHtml(expectedType)}</code><button class="icon-button" title="Copy type" data-action="copy-expected">⧉</button></div></details>`
    : "";
  const inferredType = cursorInfo?.inferredType;
  const inferredTypeHtml = inferredType && inferredType !== expectedType && !symbol
    ? `<details open><summary>Type</summary><div class="expected"><span class="type-marker">:</span><code>${escapeHtml(inferredType)}</code></div></details>`
    : "";
  const semanticContext = Array.isArray(cursorInfo?.localContext) ? cursorInfo.localContext : [];
  const contextHtml = semanticContext.length && !goals.length
    ? `<details open><summary>Context</summary>${renderContext(semanticContext)}</details>`
    : "";

  let goalsHtml = "";
  if (proof?.goalsAccomplished || (kernel === "verified" && hasDeclaration && goals.length === 0)) {
    goalsHtml = `<details open><summary>Messages <span class="tally info">ⓘ 1</span></summary><div class="accomplished">Goals accomplished!</div></details>`;
  } else if (goals.length) {
    goalsHtml = `<details open><summary>Goals <span class="count">(${goals.length})</span></summary>${goals.map((goal, index) => `<section class="goal"><div class="goal-label">${goals.length > 1 ? `Goal ${index + 1}/${goals.length}` : "Current goal"}</div>${renderContext(goal.context)}<div class="target"><span class="turnstile">⊢</span><code>${escapeHtml(goal.target ?? "<unknown>")}</code><button class="icon-button" title="Copy goal" data-action="copy-goal" data-index="${index}">⧉</button></div></section>`).join("")}</details>`;
  }

  const nearCompilerDiagnostics = nearDiagnostics.filter((item) => !String(item.code ?? "").startsWith("PSL"));
  const nearHtml = nearCompilerDiagnostics.length
    ? `<details open><summary>Messages ${renderTally(nearCompilerDiagnostics)}</summary>${nearCompilerDiagnostics.map((item, index) => renderDiagnostic(item, nearDiagnostics.indexOf(item), "near")).join("")}</details>`
    : "";

  const suggestionsHtml = actions.length
    ? `<details open><summary>Suggestions <span class="count">(${actions.length})</span></summary><div class="suggestions">${actions.map((action, index) => `<button class="suggestion" data-action="apply-fix" data-index="${index}"><span>${escapeHtml(action.title)}</span></button>`).join("")}</div><div class="hint">Press <kbd>Ctrl</kbd>+<kbd>.</kbd> for editor quick fixes.</div></details>`
    : "";

  const lintHtml = lintDiagnostics.length
    ? `<details><summary>Warnings ${renderTally(lintDiagnostics)}</summary>${lintDiagnostics.map((item, index) => renderDiagnostic(item, allDiagnostics.indexOf(item), "all", { compact: true })).join("")}</details>`
    : "";

  const allMessagesOpen = compilerDiagnostics.length > nearCompilerDiagnostics.length && nearCompilerDiagnostics.length === 0 ? " open" : "";
  const allMessagesHtml = `<details${allMessagesOpen}><summary>All Messages ${renderTally(compilerDiagnostics)}</summary>${compilerDiagnostics.length ? compilerDiagnostics.map((item, index) => renderDiagnostic(item, allDiagnostics.indexOf(item), "all", { compact: true })).join("") : `<div class="empty compact">No messages.</div>`}</details>`;

  const checkedLine = kernel === "verified" ? `<div class="technical-row"><span>Status</span><strong>verified</strong></div>`
    : kernel === "rejected" ? `<div class="technical-row"><span>Status</span><strong class="error-text">rejected</strong></div>`
      : frontend === "checked" ? `<div class="technical-row"><span>Status</span><span>language accepted; proof checking unavailable</span></div>`
        : `<div class="technical-row"><span>Status</span><span>not checked</span></div>`;
  const checkerMessages = [...new Set(nearCompilerDiagnostics.map((item) => item?.data?.rawMessage).filter((raw) => raw))];
  const checkerHtml = checkerMessages.length ? `<div class="technical-block"><div class="technical-label">Checker message</div>${checkerMessages.map((raw) => `<pre>${escapeHtml(raw)}</pre>`).join("")}</div>` : "";
  const technicalHtml = `<details><summary>Details</summary>${checkedLine}<div class="technical-row"><span>Kernel</span><span>PSKernel</span></div><div class="technical-row"><span>Core format</span><span>v${escapeHtml(String(coreFormat))}</span></div><div class="technical-row"><span>Kernel profile</span><span>${escapeHtml(coreProfile)}</span></div>${migrationProfile ? `<div class="technical-row"><span>Migration</span><span>${escapeHtml(migrationProfile)} · ${escapeHtml(migration)}</span></div>` : ""}${hasDeclaration ? `<div class="technical-row"><span>Declaration</span><code>${escapeHtml(proof.declaration.sourceName ?? proof.declaration.name ?? "")}</code></div>` : ""}${checkerHtml}</details>`;

  const noInfo = !symbolHtml && !inferredTypeHtml && !expectedTypeHtml && !contextHtml && !goalsHtml && !nearHtml && !actions.length
    ? `<div class="empty">No information at this position.</div>` : "";

  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"><style>
    :root{color-scheme:light dark}*{box-sizing:border-box}body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);padding:7px 10px 18px;margin:0}.location{font-size:12px;margin:2px 0 8px;font-weight:600}details{border-top:1px solid var(--vscode-panel-border);padding-top:5px;margin-top:6px}summary{cursor:pointer;user-select:none;font-weight:500;padding:4px 0;color:var(--vscode-foreground)}code{font-family:var(--vscode-editor-font-family);font-size:var(--vscode-editor-font-size);white-space:pre-wrap;overflow-wrap:anywhere}.expected,.target{display:grid;grid-template-columns:auto 1fr auto;gap:7px;padding:7px 4px 5px}.turnstile{font-weight:700;color:var(--vscode-symbolIcon-keyForeground)}.type-marker{font-weight:700;color:var(--vscode-descriptionForeground)}.accomplished{padding:8px 5px;color:var(--vscode-testing-iconPassed);font-weight:600}.goal{padding:5px 2px}.goal-label,.context-title,.message-head,.symbol-kind{font-size:10px;color:var(--vscode-descriptionForeground)}.context-row{display:grid;grid-template-columns:auto 1fr;column-gap:6px;padding:2px 4px}.name{font-family:var(--vscode-editor-font-family);color:var(--vscode-symbolIcon-variableForeground)}.context-title{text-transform:uppercase;letter-spacing:.05em;padding:4px}.message-item{border-left:2px solid var(--vscode-panel-border);padding:7px 8px;margin:6px 2px}.message-item.error{border-color:var(--vscode-errorForeground)}.message-item.warn{border-color:var(--vscode-editorWarning-foreground)}.message-summary{font-family:var(--vscode-editor-font-family);line-height:1.45;white-space:pre-wrap}.message-why{margin-top:6px;line-height:1.4;color:var(--vscode-descriptionForeground)}.hint-line{margin-top:6px;color:var(--vscode-descriptionForeground);line-height:1.4}.raw{border:0;margin:5px 0 0;padding:0}.raw summary{font-size:11px;color:var(--vscode-descriptionForeground);padding:2px 0}.raw pre{white-space:pre-wrap;font-family:var(--vscode-editor-font-family);font-size:11px;color:var(--vscode-descriptionForeground)}.message-actions,.micro-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}button{font:inherit;color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground);border:0;padding:3px 7px;cursor:pointer;border-radius:2px}button:hover{background:var(--vscode-button-secondaryHoverBackground)}.suggestion{display:flex;width:100%;text-align:left;margin:4px 0;padding:6px 8px}.text-button,.icon-button{background:transparent;color:var(--vscode-textLink-foreground);padding:1px 4px}.symbol-card{padding:6px 4px}.symbol-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.signature{display:block;margin-top:6px}.badge{font-size:10px;padding:1px 5px;border-radius:8px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}.badge.checked{color:var(--vscode-testing-iconPassed)}.technical-row{display:grid;grid-template-columns:92px 1fr;gap:8px;padding:3px 4px;color:var(--vscode-descriptionForeground)}.technical-block{padding:6px 4px;color:var(--vscode-descriptionForeground)}.technical-label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}.technical-block pre{white-space:pre-wrap;font-family:var(--vscode-editor-font-family);font-size:11px;margin:0}.error-text{color:var(--vscode-errorForeground)}.empty{color:var(--vscode-descriptionForeground);padding:9px 3px}.empty.compact{padding:6px 4px}.count,.tally{font-weight:400;color:var(--vscode-descriptionForeground);margin-left:3px}.tally.error{color:var(--vscode-errorForeground)}.tally.warn{color:var(--vscode-editorWarning-foreground)}.suggestions{padding:2px 0}.hint{font-size:10px;color:var(--vscode-descriptionForeground);padding:4px}kbd{border:1px solid var(--vscode-panel-border);border-radius:2px;padding:0 3px}
  </style></head><body>
    <div class="location">▼ ${escapeHtml(location)}</div>
    ${symbolHtml}${contextHtml}${inferredTypeHtml}${expectedTypeHtml}${goalsHtml}${nearHtml}${suggestionsHtml}${lintHtml}${allMessagesHtml}${technicalHtml}${noInfo}
    <script>const vscode=acquireVsCodeApi();document.addEventListener('click',(event)=>{const button=event.target.closest('button[data-action]');if(!button)return;vscode.postMessage({type:button.dataset.action,index:Number(button.dataset.index||0),scope:button.dataset.scope||null});});</script>
  </body></html>`;
}
function renderTally(items) {
  const errors = items.filter((x) => x.severity === 1).length;
  const warnings = items.filter((x) => x.severity === 2).length;
  const info = items.filter((x) => x.severity === 3 || x.severity === 4).length;
  if (!items.length) return `<span class="tally">(0)</span>`;
  return `<span class="tally ${errors ? "error" : warnings ? "warn" : ""}">(${errors ? `×${errors} ` : ""}${warnings ? `⚠${warnings} ` : ""}${info ? `ⓘ${info}` : ""})</span>`;
}
function renderDiagnostic(item, index, scope, options = {}) {
  const cls = item.severity === 1 ? "error" : item.severity === 2 ? "warn" : "";
  const where = item.range ? `${item.range.start.line + 1}:${item.range.start.character + 1}` : "";
  const guidance = item.data ?? {};
  const summary = guidance.summary ?? item.message ?? String(item);
  const explanation = guidance.explanation && guidance.explanation !== summary ? guidance.explanation : "";
  const raw = guidance.rawMessage && guidance.rawMessage !== summary ? guidance.rawMessage : "";
  const suggestions = Array.isArray(guidance.suggestions) ? guidance.suggestions : [];
  const code = item.code ? String(item.code) : "";
  const head = options.compact ? `${code ? `${code} · ` : ""}${where}` : where;
  const firstHint = suggestions[0];
  return `<div class="message-item ${cls}">${head ? `<div class="message-head">${escapeHtml(head)}</div>` : ""}<div class="message-summary">${escapeHtml(summary)}</div>${explanation ? `<div class="message-why">${escapeHtml(explanation)}</div>` : ""}${firstHint ? `<div class="hint-line"><b>Hint:</b> ${escapeHtml(firstHint)}</div>` : ""}${suggestions.length > 1 ? `<details class="raw"><summary>More suggestions</summary><ul>${suggestions.slice(1).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></details>` : ""}<div class="message-actions"><button data-action="go-diagnostic" data-scope="${scope}" data-index="${index}">Go to source</button><button data-action="copy-diagnostic" data-scope="${scope}" data-index="${index}">Copy</button></div></div>`;
}
function renderContext(context) {
  if (!Array.isArray(context) || context.length === 0) return `<div class="context-title">Context</div><div class="empty compact">No local hypotheses.</div>`;
  return `<div class="context-title">Context</div>${context.map((item) => `<div class="context-row"><span class="name">${escapeHtml(item.name)}</span><code>: ${escapeHtml(item.type)}</code></div>`).join("")}`;
}
function diagnosticLine(item) { return item?.range?.start?.line ?? Number.MAX_SAFE_INTEGER; }
function distanceToLine(item, line) { return Math.abs(diagnosticLine(item) - line); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }

function validateProofScriptProtocol(initializeResult, launchLabel) {
  const reported = initializeResult?.experimental?.proofscript?.protocolVersion;
  if (reported !== EXPECTED_LSP_PROTOCOL_VERSION) {
    const actual = reported === undefined ? "missing" : String(reported);
    throw new Error(`ProofScript LSP protocol mismatch: VS Code extension expects protocol v${EXPECTED_LSP_PROTOCOL_VERSION}, but ${launchLabel} reported ${actual}. Use the bundled server or update proofscript.lsp.path to a matching ProofScript LSP.`);
  }
}

async function handleInfoviewAction(message) {
  const editor = vscode.window.activeTextEditor;
  if (!message?.type) return;
  if (message.type === "apply-fix") return applyLspAction(infoview.action(message.index));
  if (message.type === "go-diagnostic") {
    const item = infoview.diagnostic(message.scope, message.index);
    if (editor && item?.range) { const range = toRange(item.range); editor.selection = new vscode.Selection(range.start, range.end); editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport); }
    return;
  }
  if (message.type === "copy-diagnostic") {
    const item = infoview.diagnostic(message.scope, message.index); if (item) await vscode.env.clipboard.writeText(item.data?.rawMessage ?? item.message ?? ""); return;
  }
  if (message.type === "copy-symbol") { const text = infoview.cursorInfo?.symbol?.signature; if (text) await vscode.env.clipboard.writeText(text); return; }
  if (message.type === "copy-expected") { const text = infoview.cursorInfo?.expectedType ?? infoview.proof?.expectedType; if (text) await vscode.env.clipboard.writeText(text); return; }
  if (message.type === "copy-goal") { const goal = infoview.proof?.goals?.[message.index]; if (goal) await vscode.env.clipboard.writeText(formatGoal(goal)); return; }
  if (message.type === "copy-proof-status") await vscode.env.clipboard.writeText("Goals accomplished!");
}
function formatGoal(goal) { return `${(goal.context ?? []).map((x) => `${x.name} : ${x.type}`).join("\n")}${goal.context?.length ? "\n" : ""}⊢ ${goal.target ?? ""}`; }

function rememberDocumentStatus(status) {
  if (!status?.uri) return status;
  lastDocumentStatusByUri.set(status.uri, status);
  return status;
}
function statusFromDocumentStatusChanged(params) {
  if (!params?.uri) return null;
  return rememberDocumentStatus({ uri: params.uri, version: params.version, generation: params.generation, ...(params.status ?? {}) });
}
function activeProofscriptEditor() {
  const editor = vscode.window.activeTextEditor;
  return editor?.document.languageId === "proofscript" ? editor : null;
}
async function requestCurrentProofContext() {
  const editor = activeProofscriptEditor();
  if (!editor) {
    vscode.window.showInformationMessage("Open a ProofScript file first.");
    return null;
  }
  if (!client?.ready) {
    vscode.window.showWarningMessage("ProofScript language server is not ready.");
    return null;
  }
  const textDocument = { uri: editor.document.uri.toString() };
  const position = toPos(editor.selection.active);
  const [proof, status, cursorInfo] = await Promise.all([
    client.request("proofscript/proofState", { textDocument, position }),
    client.request("proofscript/documentStatus", { textDocument }),
    client.request("proofscript/semanticInfo", { textDocument, position }),
  ]);
  rememberDocumentStatus(status);
  return { editor, proof, status, cursorInfo };
}
function formatDocumentStatusSummary(status) {
  if (!status) return "ProofScript document status is unavailable.";
  const checked = status.verifiedDeclarations ?? 0;
  const unsupported = status.unsupportedDeclarations ?? 0;
  const rejected = status.rejectedDeclarations ?? 0;
  const declarations = status.declarations ?? checked + unsupported + rejected;
  const lintWarnings = status.lintWarnings ?? 0;
  const lintInformation = status.lintInformation ?? 0;
  const lines = [
    `ProofScript document status: ${status.kernel ?? "unknown"}`,
    `Frontend: ${status.frontend ?? "unknown"}`,
    `Declarations: ${checked}/${declarations} verified${unsupported ? `, ${unsupported} unsupported` : ""}${rejected ? `, ${rejected} rejected` : ""}`,
    `Lint: ${lintWarnings} warning(s), ${lintInformation} note(s)`,
    `Core: ${status.coreProfile ?? "unknown"} / v${status.coreFormat ?? "unknown"}`,
  ];
  if (status.message) lines.push(`Message: ${status.message}`);
  return lines.join("\n");
}
function formatProofStateSummary(proof, status) {
  const lines = [formatDocumentStatusSummary(status)];
  if (proof?.declaration?.sourceName) lines.push(`Declaration: ${proof.declaration.kind ?? "declaration"} ${proof.declaration.sourceName}`);
  lines.push(`Proof state: ${proof?.status ?? "none"}`);
  if (proof?.expectedType) lines.push(`Expected type: ${proof.expectedType}`);
  const goals = Array.isArray(proof?.goals) ? proof.goals : [];
  if (goals.length) lines.push(...goals.map((goal, index) => `\nGoal ${index + 1}/${goals.length}:\n${formatGoal(goal)}`));
  else if (proof?.goalsAccomplished) lines.push("Goals accomplished!");
  for (const message of proof?.messages ?? []) lines.push(`Message: ${message}`);
  return lines.join("\n");
}
async function showCurrentDocumentStatus() {
  const context = await requestCurrentProofContext();
  if (!context) return;
  const summary = formatDocumentStatusSummary(context.status);
  output.appendLine(`\n${summary}`);
  output.show(true);
  vscode.window.showInformationMessage(summary.split("\n")[0], "Show Output").then((choice) => { if (choice) output.show(true); });
}
async function copyCurrentExpectedType() {
  const context = await requestCurrentProofContext();
  if (!context) return;
  const expectedType = context.cursorInfo?.expectedType ?? context.proof?.expectedType;
  if (!expectedType) return vscode.window.showInformationMessage("No expected type at the current cursor.");
  await vscode.env.clipboard.writeText(expectedType);
  vscode.window.showInformationMessage("ProofScript expected type copied.");
}
async function copyCurrentProofGoal() {
  const context = await requestCurrentProofContext();
  if (!context) return;
  const goal = context.proof?.goals?.[0];
  if (!goal) return vscode.window.showInformationMessage("No open proof goal at the current cursor.");
  await vscode.env.clipboard.writeText(formatGoal(goal));
  vscode.window.showInformationMessage("ProofScript current goal copied.");
}
async function copyCurrentProofState() {
  const context = await requestCurrentProofContext();
  if (!context) return;
  await vscode.env.clipboard.writeText(formatProofStateSummary(context.proof, context.status));
  vscode.window.showInformationMessage("ProofScript proof state copied.");
}

async function activate(context) {
  output = vscode.window.createOutputChannel("ProofScript");
  diagnostics = vscode.languages.createDiagnosticCollection("proofscript");
  infoview = new InfoviewProvider(handleInfoviewAction);
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 85);
  statusBar.name = "ProofScript Status";
  statusBar.command = "proofscript.showInfoview";
  statusBar.text = "$(loading~spin) ProofScript";
  statusBar.tooltip = "ProofScript language server is starting";
  verifiedDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.file(path.join(context.extensionPath, "media", "kernel-verified.svg")),
    gutterIconSize: "contain",
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });
  theoremErrorDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.file(path.join(context.extensionPath, "media", "theorem-error.svg")),
    gutterIconSize: "contain",
    overviewRulerColor: new vscode.ThemeColor("editorError.foreground"),
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });
  warningDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.file(path.join(context.extensionPath, "media", "warning.svg")),
    gutterIconSize: "contain",
    overviewRulerColor: new vscode.ThemeColor("editorWarning.foreground"),
    overviewRulerLane: vscode.OverviewRulerLane.Left,
  });
  context.subscriptions.push(output, diagnostics, statusBar, verifiedDecoration, theoremErrorDecoration, warningDecoration, vscode.window.registerWebviewViewProvider("proofscript.infoview", infoview));
  registerCommands(context);
  registerLanguageProviders(context);
  const proofscriptWatcher = vscode.workspace.createFileSystemWatcher("**/*.ps");
  const notifyWatched = (uri, type) => { if (client?.ready) client.sendNotification("workspace/didChangeWatchedFiles", { changes: [{ uri: uri.toString(), type }] }); };
  context.subscriptions.push(
    proofscriptWatcher,
    proofscriptWatcher.onDidCreate((uri) => notifyWatched(uri, 1)),
    proofscriptWatcher.onDidChange((uri) => notifyWatched(uri, 2)),
    proofscriptWatcher.onDidDelete((uri) => notifyWatched(uri, 3)),
    vscode.workspace.onDidChangeWorkspaceFolders((event) => { if (client?.ready) client.sendNotification("workspace/didChangeWorkspaceFolders", { event: { added: event.added.map((folder) => ({ uri: folder.uri.toString(), name: folder.name })), removed: event.removed.map((folder) => ({ uri: folder.uri.toString(), name: folder.name })) } }); }),
    vscode.workspace.onDidOpenTextDocument((document) => { if (document.languageId === "proofscript") { didOpen(document); scheduleDecorationUpdate(); } }),
    vscode.workspace.onDidChangeTextDocument((event) => { if (event.document.languageId === "proofscript") { didChange(event); scheduleDecorationUpdate(); } }),
    vscode.workspace.onDidCloseTextDocument((document) => { if (document.languageId === "proofscript") didClose(document); }),
    vscode.window.onDidChangeTextEditorSelection(() => scheduleInfoviewUpdate()),
    vscode.window.onDidChangeActiveTextEditor((editor) => { updateStatusBarVisibility(); const cached = editor?.document?.languageId === "proofscript" ? lastDocumentStatusByUri.get(editor.document.uri.toString()) : null; if (cached) updateStatusBar(cached, "Cached document status"); scheduleInfoviewUpdate(); scheduleDecorationUpdate(); }),
    vscode.window.onDidChangeVisibleTextEditors(() => scheduleDecorationUpdate()),
  );
  updateStatusBarVisibility();
  await startClient(context);
  for (const document of vscode.workspace.textDocuments) if (document.languageId === "proofscript") didOpen(document);
  scheduleInfoviewUpdate();
  scheduleDecorationUpdate();
}

async function startClient(context) {
  infoview.setServerReady(false, "Starting language server…");
  const next = new RpcClient(output, context.extensionPath);
  try {
    await next.start();
    client = next;
    context.subscriptions.push({ dispose: next.on("textDocument/publishDiagnostics", publishDiagnostics) });
    context.subscriptions.push({ dispose: next.on("proofscript/documentStatusChanged", (params) => { const status = statusFromDocumentStatusChanged(params); const editor = vscode.window.activeTextEditor; if (status && editor?.document.uri.toString() === params?.uri) updateStatusBar(status, status.message ?? "Document status updated"); scheduleInfoviewUpdate(); scheduleDecorationUpdate(); }) });
    context.subscriptions.push({ dispose: next.on("proofscript/documentProcessing", (params) => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.uri.toString() !== params?.uri) return;
      if (params?.processing) {
        statusBar.text = "$(loading~spin) ProofScript";
        statusBar.tooltip = "ProofScript is checking the current document…";
      } else scheduleInfoviewUpdate();
    }) });
    infoview.setServerReady(true);
    updateStatusBar({ frontend: "checked", kernel: "not-run" }, "Ready");
  } catch (error) {
    client = next;
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(message);
    infoview.setServerReady(false, message);
    updateStatusBar({ frontend: "rejected", kernel: "not-run" }, "LSP failed");
    vscode.window.showErrorMessage(`ProofScript language server failed to start: ${message}`, "Show Output").then((choice) => { if (choice) output.show(true); });
  }
}

function publishDiagnostics(params) {
  const uri = vscode.Uri.parse(params.uri);
  const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === params.uri);
  if (Number.isInteger(params.version) && open && params.version < open.version) {
    output?.appendLine(`Ignoring stale diagnostics for ${params.uri}: server v${params.version}, editor v${open.version}`);
    return;
  }
  diagnostics.set(uri, (params.diagnostics ?? []).map((item) => {
    const diagnostic = new vscode.Diagnostic(toRange(item.range), item.message, toSeverity(item.severity));
    diagnostic.code = item.code;
    diagnostic.source = item.source;
    diagnostic.proofscriptData = item.data;
    return diagnostic;
  }));
  scheduleInfoviewUpdate();
  scheduleDecorationUpdate();
}

function didOpen(document) {
  if (!client?.ready) return;
  client.sendNotification("textDocument/didOpen", { textDocument: { uri: document.uri.toString(), languageId: "proofscript", version: document.version, text: document.getText() } });
}
function didChange(event) {
  if (!client?.ready) return;
  const document = event.document;
  const changes = (event.contentChanges ?? []).map((change) => ({
    range: toPlainRange(change.range),
    rangeLength: change.rangeLength,
    text: change.text,
  }));
  if (!changes.length) return;
  client.sendNotification("textDocument/didChange", { textDocument: { uri: document.uri.toString(), version: document.version }, contentChanges: changes });
}
function didClose(document) {
  lastDocumentStatusByUri.delete(document.uri.toString());
  if (!client?.ready) return;
  client.sendNotification("textDocument/didClose", { textDocument: { uri: document.uri.toString() } });
  diagnostics.delete(document.uri);
}

function registerLanguageProviders(context) {
  const selector = { language: "proofscript" };
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
    provideHover: async (document, position, token) => {
      if (!client?.ready) return null;
      const result = await client.request("textDocument/hover", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      if (!result) return null;
      return new vscode.Hover(new vscode.MarkdownString(result.contents?.value ?? String(result.contents ?? "")), result.range ? toRange(result.range) : undefined);
    },
  }));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, {
    provideCompletionItems: async (document, position, token) => {
      if (!client?.ready) return [];
      const result = await client.request("textDocument/completion", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      return (result?.items ?? []).map((item) => {
        const completion = new vscode.CompletionItem(item.label, mapCompletionKind(item.kind));
        completion.detail = item.detail;
        completion.sortText = item.sortText;
        completion.preselect = item.preselect === true;
        if (Array.isArray(item.additionalTextEdits)) completion.additionalTextEdits = item.additionalTextEdits.map((edit) => vscode.TextEdit.replace(toRange(edit.range), edit.newText));
        return completion;
      });
    },
  }, "."));
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
    provideDefinition: async (document, position, token) => {
      if (!client?.ready) return null;
      const result = await client.request("textDocument/definition", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      if (!result) return null;
      return new vscode.Location(vscode.Uri.parse(result.uri), toRange(result.range));
    },
  }));
  context.subscriptions.push(vscode.languages.registerReferenceProvider(selector, {
    provideReferences: async (document, position, context, token) => {
      if (!client?.ready) return [];
      const result = await client.request("textDocument/references", { textDocument: { uri: document.uri.toString() }, position: toPos(position), context: { includeDeclaration: context.includeDeclaration } }, token);
      return (result ?? []).map((item) => new vscode.Location(vscode.Uri.parse(item.uri), toRange(item.range)));
    },
  }));
  context.subscriptions.push(vscode.languages.registerRenameProvider(selector, {
    prepareRename: async (document, position, token) => {
      if (!client?.ready) return null;
      const result = await client.request("textDocument/prepareRename", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      if (!result) return null;
      return { range: toRange(result.range), placeholder: result.placeholder };
    },
    provideRenameEdits: async (document, position, newName, token) => {
      if (!client?.ready) return null;
      const result = await client.request("textDocument/rename", { textDocument: { uri: document.uri.toString() }, position: toPos(position), newName }, token);
      if (!result?.changes) return null;
      const edit = new vscode.WorkspaceEdit();
      for (const [uri, edits] of Object.entries(result.changes)) for (const item of edits) edit.replace(vscode.Uri.parse(uri), toRange(item.range), item.newText);
      return edit;
    },
  }));
  context.subscriptions.push(vscode.languages.registerWorkspaceSymbolProvider({
    provideWorkspaceSymbols: async (query, token) => {
      if (!client?.ready) return [];
      const result = await client.request("workspace/symbol", { query }, token);
      return (result ?? []).map((item) => new vscode.SymbolInformation(item.name, mapSymbolKind(item.kind), item.containerName ?? "", new vscode.Location(vscode.Uri.parse(item.location.uri), toRange(item.location.range))));
    },
  }));
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, {
    provideDocumentSymbols: async (document, token) => {
      if (!client?.ready) return [];
      const result = await client.request("textDocument/documentSymbol", { textDocument: { uri: document.uri.toString() } }, token);
      return (result ?? []).map((item) => new vscode.DocumentSymbol(item.name, item.detail ?? "", mapSymbolKind(item.kind), toRange(item.range), toRange(item.selectionRange)));
    },
  }));
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, {
    provideCodeActions: async (document, range, actionContext) => {
      if (!client?.ready) return [];
      const result = await client.request("textDocument/codeAction", {
        textDocument: { uri: document.uri.toString() },
        range: toPlainRange(range),
        context: { diagnostics: actionContext.diagnostics.map(toLspDiagnostic), only: actionContext.only?.value ? [actionContext.only.value] : undefined },
      });
      return (result ?? []).map((item) => toVsCodeAction(item)).filter(Boolean);
    },
  }, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.SourceOrganizeImports] }));
  context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(selector, {
    provideSignatureHelp: async (document, position, token) => {
      if (!client?.ready) return null;
      const result = await client.request("textDocument/signatureHelp", { textDocument: { uri: document.uri.toString() }, position: toPos(position) }, token);
      if (!result) return null;
      const help = new vscode.SignatureHelp();
      help.activeSignature = result.activeSignature ?? 0;
      help.activeParameter = result.activeParameter ?? 0;
      help.signatures = (result.signatures ?? []).map((signature) => {
        const info = new vscode.SignatureInformation(signature.label, signature.documentation);
        info.parameters = (signature.parameters ?? []).map((param) => new vscode.ParameterInformation(param.label, param.documentation));
        return info;
      });
      return help;
    },
  }, "(", ","));
  const legend = new vscode.SemanticTokensLegend(["namespace", "type", "class", "enum", "struct", "typeParameter", "parameter", "variable", "property", "enumMember", "function", "method", "keyword", "operator", "number", "string", "comment"], ["declaration", "readonly", "deprecated"]);
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, {
    provideDocumentSemanticTokens: async (document, token) => {
      if (!client?.ready) return new vscode.SemanticTokensBuilder(legend).build();
      const result = await client.request("textDocument/semanticTokens/full", { textDocument: { uri: document.uri.toString() } }, token);
      const builder = new vscode.SemanticTokensBuilder(legend);
      let line = 0;
      let character = 0;
      for (let index = 0; index < (result?.data?.length ?? 0); index += 5) {
        const deltaLine = result.data[index];
        const deltaCharacter = result.data[index + 1];
        line += deltaLine;
        character = deltaLine === 0 ? character + deltaCharacter : deltaCharacter;
        builder.push(line, character, result.data[index + 2], result.data[index + 3], result.data[index + 4]);
      }
      return builder.build();
    },
  }, legend));
}

function registerCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("proofscript.restartServer", async () => {
      await client?.stop();
      diagnostics.clear();
      updateStatusBarVisibility();
  await startClient(context);
      for (const document of vscode.workspace.textDocuments) if (document.languageId === "proofscript") didOpen(document);
      scheduleInfoviewUpdate();
    }),
    vscode.commands.registerCommand("proofscript.showInfoview", async () => {
      await vscode.commands.executeCommand("proofscript.infoview.focus");
      scheduleInfoviewUpdate();
    }),
    vscode.commands.registerCommand("proofscript.serverInfo", async () => {
      if (!client?.ready) { output.show(true); return; }
      const info = await client.request("proofscript/serverInfo", {});
      vscode.window.showInformationMessage(`ProofScript LSP ${info.protocolVersion}; PSKernel: ${info.coreProfile}; semantic baseline: ${info.semanticBaseline}; proof mode: ${info.proofMode}`);
    }),
    vscode.commands.registerCommand("proofscript.doctor", async () => {
      await runDoctorReport(context);
    }),
    vscode.commands.registerCommand("proofscript.showDocumentStatus", showCurrentDocumentStatus),
    vscode.commands.registerCommand("proofscript.copyExpectedType", copyCurrentExpectedType),
    vscode.commands.registerCommand("proofscript.copyCurrentGoal", copyCurrentProofGoal),
    vscode.commands.registerCommand("proofscript.copyProofState", copyCurrentProofState),
    vscode.commands.registerCommand("proofscript.showOutput", () => output.show(true)),
    vscode.commands.registerCommand("proofscript.lintFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "proofscript") return vscode.window.showInformationMessage("Open a ProofScript file to run the linter.");
      if (!client?.ready) return vscode.window.showWarningMessage("ProofScript language server is not ready.");
      const findings = await client.request("proofscript/lint", { textDocument: { uri: editor.document.uri.toString() } });
      const warnings = (findings ?? []).filter((item) => item.severity === 2).length;
      const info = (findings ?? []).filter((item) => item.severity === 3).length;
      if (!findings?.length) vscode.window.showInformationMessage("ProofScript linter: no findings.");
      else {
        vscode.window.showInformationMessage(`ProofScript linter: ${warnings} warning${warnings === 1 ? "" : "s"}, ${info} note${info === 1 ? "" : "s"}.`, "Show Infoview").then((choice) => { if (choice) vscode.commands.executeCommand("proofscript.showInfoview"); });
        scheduleInfoviewUpdate();
      }
    }),
    vscode.commands.registerCommand("proofscript.explainDiagnostic", async (diagnostic) => {
      if (!diagnostic) { await vscode.commands.executeCommand("proofscript.showInfoview"); return; }
      const explanation = client?.ready ? await client.request("proofscript/explainDiagnostic", { diagnostic }) : diagnostic.data;
      output.appendLine(`\n[${diagnostic.code ?? "ProofScript"}] ${explanation?.summary ?? diagnostic.message ?? "Diagnostic"}`);
      if (explanation?.explanation) output.appendLine(explanation.explanation);
      if (explanation?.rawMessage && explanation.rawMessage !== explanation.summary) output.appendLine(`Compiler detail: ${explanation.rawMessage}`);
      if (explanation?.suggestions?.length) output.appendLine(`Suggestions:\n- ${explanation.suggestions.join("\n- ")}`);
      output.show(true);
    }),
  );
}

async function runDoctorReport(context) {
  output.appendLine("\nProofScript Doctor");
  output.appendLine(`Extension version: ${context.extension?.packageJSON?.version ?? "unknown"}`);
  output.appendLine(`Expected LSP protocol: ${EXPECTED_LSP_PROTOCOL_VERSION}`);
  output.appendLine(`Launch mode: ${client?.launchLabel || "not-started"}`);
  output.appendLine(`Workspace folders: ${(vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath).join(", ") || "none"}`);
  output.appendLine(`Node: ${process.version}`);
  output.appendLine(`Configured proofscript.lsp.path: ${vscode.workspace.getConfiguration("proofscript").get("lsp.path") ?? "<bundled>"}`);
  if (!client?.ready) {
    output.appendLine("Server: not ready");
    output.show(true);
    return;
  }
  try {
    const [info, stats] = await Promise.all([
      client.request("proofscript/serverInfo", {}),
      client.request("proofscript/serverStats", {}),
    ]);
    output.appendLine(`Server protocol: ${info?.protocolVersion ?? "unknown"}`);
    output.appendLine(`Core profile: ${info?.coreProfile ?? "unknown"}`);
    output.appendLine(`Core format: ${info?.coreFormat ?? "unknown"}`);
    output.appendLine(`Semantic baseline: ${info?.semanticBaseline ?? "unknown"}`);
    output.appendLine(`Proof mode: ${info?.proofMode ?? "unknown"}`);
    output.appendLine(`Worker lanes: ${Object.keys(info?.workers ?? {}).join(", ") || "unknown"}`);
    const semanticStats = stats?.semantic ?? {};
    output.appendLine(`Open documents: ${stats?.openDocuments ?? "unknown"}`);
    output.appendLine(`Transport state epoch: ${stats?.transportStateEpoch ?? "unknown"}`);
    output.appendLine(`Stale document results: ${stats?.staleDocumentResults ?? "unknown"}`);
    output.appendLine(`Late cancellations: ${stats?.lateCancellations ?? "unknown"}`);
    output.appendLine(`Editor cache entries: ${semanticStats.editorFeatureCacheEntries ?? "unknown"}`);
    output.appendLine(`Editor cache evictions: ${semanticStats.editorFeatureCacheEvictions ?? "unknown"}`);
    output.appendLine(`Editor latency max ms: ${semanticStats.editorFeatureLatencyMaxMs ?? "unknown"}`);
  } catch (error) {
    output.appendLine(`Doctor request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  output.show(true);
}

function scheduleDecorationUpdate() {
  clearTimeout(decorationTimer);
  decorationTimer = setTimeout(updateDecorationsForVisibleEditors, 120);
}
async function updateDecorationsForVisibleEditors() {
  if (!client?.ready) return;
  await Promise.all(vscode.window.visibleTextEditors.filter((editor) => editor.document.languageId === "proofscript").map(updateEditorDecorations));
}
async function updateEditorDecorations(editor) {
  try {
    const statuses = await client.request("proofscript/declarationStatuses", { textDocument: { uri: editor.document.uri.toString() } });
    const checked = [];
    const theoremErrors = [];
    const warnings = [];
    const theoremLines = new Map();
    for (const item of statuses ?? []) {
      const line = item.selectionRange?.start?.line ?? item.range?.start?.line ?? 0;
      if (item.kind === "theorem") theoremLines.set(line, item);
      const range = new vscode.Range(line, 0, line, 0);
      if (item.kind === "theorem" && item.kernel === "verified") {
        checked.push({ range, hoverMessage: new vscode.MarkdownString(`$(check) **Goals accomplished**\n\n${item.sourceName}\n\n[Open Infoview](command:proofscript.showInfoview)`) });
      } else if (item.kind === "theorem" && item.kernel === "rejected") {
        theoremErrors.push({ range, hoverMessage: new vscode.MarkdownString(`$(error) **Theorem rejected**\n\n${item.sourceName}${item.message ? `\n\n${item.message}` : ""}\n\n[Open Infoview](command:proofscript.showInfoview)`) });
      } else if (item.kind === "theorem" && item.kernel === "unsupported") {
        warnings.push({ range, hoverMessage: new vscode.MarkdownString(`$(warning) **Theorem not fully checked**\n\n${item.sourceName}${item.message ? `\n\n${item.message}` : ""}\n\n[Open Infoview](command:proofscript.showInfoview)`) });
      }
    }

    // Lean-like warning gutter markers for advisory diagnostics. Red gutter markers remain theorem-only.
    for (const diagnostic of diagnostics.get(editor.document.uri) ?? []) {
      if (diagnostic.severity !== vscode.DiagnosticSeverity.Warning) continue;
      const line = diagnostic.range.start.line;
      if (warnings.some((item) => item.range.start.line === line)) continue;
      warnings.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: new vscode.MarkdownString(`$(warning) **${diagnostic.message}**${diagnostic.code ? `\n\n${diagnostic.code}` : ""}\n\n[Open Infoview](command:proofscript.showInfoview)`),
      });
    }

    editor.setDecorations(verifiedDecoration, checked);
    editor.setDecorations(theoremErrorDecoration, theoremErrors);
    editor.setDecorations(warningDecoration, warnings);
  } catch (error) {
    output.appendLine(`ProofScript declaration decorations: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function scheduleInfoviewUpdate() {
  clearTimeout(selectionTimer);
  const delay = Math.max(0, Number(vscode.workspace.getConfiguration("proofscript").get("infoview.debounceTime", 60)) || 0);
  selectionTimer = setTimeout(updateInfoview, delay);
}
async function updateInfoview() {
  const requestGeneration = ++infoviewRequestGeneration;
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "proofscript") {
    infoview.update({ status: "none", goals: [], messages: [] }, null, null, { fileName: null, line: null, serverReady: !!client?.ready });
    updateStatusBarVisibility();
    return;
  }
  const meta = { fileName: path.basename(editor.document.uri.fsPath || editor.document.uri.path), line: editor.selection.active.line + 1, character: editor.selection.active.character + 1, serverReady: !!client?.ready };
  if (!client?.ready) {
    infoview.update({ status: "unavailable", goals: [], messages: [] }, null, null, meta);
    updateStatusBar({ frontend: "rejected", kernel: "not-run" }, "Language server unavailable");
    return;
  }
  try {
    const params = { textDocument: { uri: editor.document.uri.toString() }, position: toPos(editor.selection.active) };
    const documentUri = editor.document.uri.toString();
    const documentVersion = editor.document.version;
    const cursorLine = editor.selection.active.line;
    const cursorCharacter = editor.selection.active.character;
    const [proof, status, cursorInfo] = await Promise.all([
      client.request("proofscript/proofState", params),
      client.request("proofscript/documentStatus", { textDocument: { uri: documentUri } }),
      client.request("proofscript/semanticInfo", params),
    ]);
    const currentEditor = vscode.window.activeTextEditor;
    if (requestGeneration !== infoviewRequestGeneration || !currentEditor || currentEditor.document.uri.toString() !== documentUri || currentEditor.document.version !== documentVersion || currentEditor.selection.active.line !== cursorLine || currentEditor.selection.active.character !== cursorCharacter) return;
    rememberDocumentStatus(status);
    infoview.update(proof, status, cursorInfo, meta);
    const currentStatus = proof?.declaration
      ? { ...status, frontend: proof?.verification?.frontend ?? status?.frontend, kernel: proof?.verification?.kernel ?? status?.kernel }
      : status;
    const documentNote = proof?.declaration && status?.rejectedDeclarations
      ? `${status.rejectedDeclarations} other declaration${status.rejectedDeclarations === 1 ? "" : "s"} rejected in this file`
      : proof?.messages?.[0];
    updateStatusBar(currentStatus, documentNote);
  } catch (error) {
    infoview.update({ status: "unavailable", goals: [], messages: [String(error)] }, null, null, meta);
    updateStatusBar({ frontend: "rejected", kernel: "rejected" }, String(error));
  }
}

function updateStatusBarVisibility() {
  const editor = vscode.window.activeTextEditor;
  if (editor?.document.languageId === "proofscript") statusBar?.show();
  else statusBar?.hide();
}

function updateStatusBar(status, detail) {
  if (!statusBar) return;
  updateStatusBarVisibility();
  const kernel = status?.kernel ?? "not-run";
  statusBar.color = undefined;
  if (!client?.ready) {
    statusBar.text = "$(loading~spin) ProofScript";
    statusBar.tooltip = detail ?? "ProofScript language server is starting";
    return;
  }
  if (kernel === "verified") {
    statusBar.text = "$(check) ProofScript";
    statusBar.color = new vscode.ThemeColor("testing.iconPassed");
    statusBar.tooltip = `ProofScript — checked${status?.lintWarnings ? `\n${status.lintWarnings} warning(s)` : ""}`;
  } else if (kernel === "rejected") {
    statusBar.text = "$(error) ProofScript";
    statusBar.color = new vscode.ThemeColor("errorForeground");
    statusBar.tooltip = `ProofScript — rejected${detail ? `\n${detail}` : ""}`;
  } else if (kernel === "unsupported") {
    statusBar.text = "$(warning) ProofScript";
    statusBar.color = new vscode.ThemeColor("editorWarning.foreground");
    statusBar.tooltip = `ProofScript — not fully checked${detail ? `\n${detail}` : ""}`;
  } else {
    statusBar.text = "ProofScript";
    statusBar.tooltip = detail ?? "ProofScript ready";
  }
}

function toPlainRange(range) { return { start: toPos(range.start), end: toPos(range.end) }; }
function toLspDiagnostic(diagnostic) {
  return { range: toPlainRange(diagnostic.range), severity: severityToLsp(diagnostic.severity), code: diagnostic.code, source: diagnostic.source, message: diagnostic.message, data: diagnostic.proofscriptData };
}
function severityToLsp(severity) {
  return severity === vscode.DiagnosticSeverity.Warning ? 2 : severity === vscode.DiagnosticSeverity.Information ? 3 : severity === vscode.DiagnosticSeverity.Hint ? 4 : 1;
}
function toVsCodeAction(item) {
  if (!item?.title) return null;
  const action = new vscode.CodeAction(item.title, item.kind === "quickfix" ? vscode.CodeActionKind.QuickFix : vscode.CodeActionKind.Empty);
  action.isPreferred = item.isPreferred === true;
  if (item.edit) action.edit = workspaceEditFromLsp(item.edit);
  if (item.command) action.command = { command: item.command.command, title: item.command.title ?? item.title, arguments: item.command.arguments ?? [] };
  return action;
}
function workspaceEditFromLsp(edit) {
  const out = new vscode.WorkspaceEdit();
  for (const [uriText, edits] of Object.entries(edit?.changes ?? {})) {
    const uri = vscode.Uri.parse(uriText);
    for (const textEdit of edits ?? []) out.replace(uri, toRange(textEdit.range), textEdit.newText ?? "");
  }
  return out;
}
async function applyLspAction(item) {
  if (!item) return;
  if (item.edit) await vscode.workspace.applyEdit(workspaceEditFromLsp(item.edit));
  if (item.command) await vscode.commands.executeCommand(item.command.command, ...(item.command.arguments ?? []));
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  return cp.spawnSync(checker, [command], { stdio: "ignore", windowsHide: true }).status === 0;
}
function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}
function toPos(position) { return { line: position.line, character: position.character }; }
function toRange(range) { return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character); }
function toSeverity(severity) {
  return severity === 2 ? vscode.DiagnosticSeverity.Warning : severity === 3 ? vscode.DiagnosticSeverity.Information : severity === 4 ? vscode.DiagnosticSeverity.Hint : vscode.DiagnosticSeverity.Error;
}
function mapCompletionKind(kind) { return Number.isInteger(kind) ? kind : vscode.CompletionItemKind.Text; }
function mapSymbolKind(kind) { return Number.isInteger(kind) ? kind : vscode.SymbolKind.Variable; }

async function deactivate() { await client?.stop(); for (const disposable of disposables) disposable.dispose?.(); }
module.exports = { activate, deactivate };
