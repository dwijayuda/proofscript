import { spawn } from "node:child_process";

export function formatProcessProgress(state, name, exitCode) {
  const normalized = String(state ?? "").toLowerCase();
  if (normalized === "start") return `[proofscript] START ${name}`;
  if (normalized === "pass") return `[proofscript] PASS  ${name}`;
  if (normalized === "fail") return `[proofscript] FAIL  ${name} (exit ${exitCode ?? "?"})`;
  return `[proofscript] ${String(state ?? "").toUpperCase()} ${name}`;
}

export function runStreamingProcess(
  command,
  args,
  {
    cwd,
    env = process.env,
    streamStdout = true,
    streamStderr = true,
  } = {},
) {
  return new Promise(resolve => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", chunk => {
      stdout += chunk;
      if (streamStdout) process.stdout.write(chunk);
    });
    child.stderr.on("data", chunk => {
      stderr += chunk;
      if (streamStderr) process.stderr.write(chunk);
    });

    child.on("error", error => {
      if (settled) return;
      settled = true;
      resolve({
        status: 1,
        signal: null,
        stdout,
        stderr,
        error,
      });
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({
        status: code ?? 1,
        signal,
        stdout,
        stderr,
        error: null,
      });
    });
  });
}
