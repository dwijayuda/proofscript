import fs = require("node:fs");

export interface NdjsonRecord {
  line: number;
  value: unknown;
}

export class ArenaMalformedInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArenaMalformedInputError";
  }
}

export function readNdjsonFile(path: string): NdjsonRecord[] {
  let text: string;
  try {
    text = fs.readFileSync(path, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ArenaMalformedInputError(`cannot read NDJSON input: ${detail}`);
  }

  const records: NdjsonRecord[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw.length === 0) continue;
    try {
      records.push({ line: i + 1, value: JSON.parse(raw) });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new ArenaMalformedInputError(`malformed JSON at line ${i + 1}: ${detail}`);
    }
  }
  return records;
}
