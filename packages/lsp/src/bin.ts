#!/usr/bin/env node
import { startLspServer } from "./index.js";

const args = new Set(process.argv.slice(2));
const debounceArg = [...args].find((arg) => arg.startsWith("--diagnostics-debounce-ms="));
const diagnosticsDebounceMs = debounceArg ? Number(debounceArg.slice(debounceArg.indexOf("=") + 1)) : undefined;

startLspServer({
  ...(Number.isFinite(diagnosticsDebounceMs) ? { diagnosticsDebounceMs } : {}),
});
