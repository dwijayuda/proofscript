#!/usr/bin/env node
import { startLspServer } from "./index.js";

const argv: string[] = Array.isArray(process.argv) ? process.argv.slice(2).map(String) : [];
const debounceArg = argv.find((arg: string) => arg.startsWith("--diagnostics-debounce-ms="));
const diagnosticsDebounceMs = debounceArg
  ? Number(debounceArg.slice(debounceArg.indexOf("=") + 1))
  : undefined;

startLspServer({
  ...(Number.isFinite(diagnosticsDebounceMs) ? { diagnosticsDebounceMs } : {}),
});
