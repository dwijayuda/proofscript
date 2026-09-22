#!/usr/bin/env node
import { readNdjsonFile, ArenaMalformedInputError } from "./ndjson";
import { checkArenaRecords } from "./classify";
import { rejected } from "./result";

export function main(argv = process.argv): number {
  const input = argv[2] ?? process.env.IN;
  if (!input) {
    const result = rejected("missing NDJSON input path; pass a file path or set $IN");
    console.log(JSON.stringify(result));
    return result.exitCode;
  }
  try {
    const result = checkArenaRecords(readNdjsonFile(input));
    console.log(JSON.stringify(result));
    return result.exitCode;
  } catch (error) {
    const message = error instanceof ArenaMalformedInputError ? error.message : error instanceof Error ? error.message : String(error);
    const result = rejected(message);
    console.log(JSON.stringify(result));
    return result.exitCode;
  }
}

process.exitCode = main(process.argv);
