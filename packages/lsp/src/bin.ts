#!/usr/bin/env node
import { startLspServer } from "./index.js";

const cliArgs = process.argv.slice(2) as string[];
const debounceArg = cliArgs.find((arg: string) => arg.startsWith("--diagnostics-debounce-ms="));
const diagnosticsDebounceMs = debounceArg
  ? Number(debounceArg.slice(debounceArg.indexOf("=") + 1))
  : undefined;

startLspServer({
  ...(Number.isFinite(diagnosticsDebounceMs) ? { diagnosticsDebounceMs } : {}),
});
