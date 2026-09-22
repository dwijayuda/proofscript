declare var process: {
  argv: string[];
  cwd(): string;
  exitCode?: number;
};

declare module "node:fs/promises" {
  export function readFile(path: string, encoding: string): Promise<string>;
  export function writeFile(path: string, data: string, encoding?: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export const sep: string;
}

declare module "node:url" {
  export function pathToFileURL(path: string): { href: string };
  export function fileURLToPath(url: string): string;
}

declare module "node:child_process" {
  export function spawnSync(command: string, args: string[], options?: { cwd?: string; encoding?: string }): {
    status: number | null;
    stdout?: string;
    stderr?: string;
    error?: unknown;
  };
}

declare module "node:test" {
  type TestFn = (name: string, fn: () => void | Promise<void>) => void;
  const test: TestFn;
  export default test;
}

declare module "node:assert/strict" {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
    throws(fn: () => unknown, expected?: RegExp | ((error: unknown) => boolean)): void;
    rejects(fn: () => Promise<unknown>, expected?: RegExp | ((error: unknown) => boolean)): Promise<void>;
  };
  export default assert;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): { update(data: string): any; digest(encoding: "hex"): string };
}

declare module "node:fs" {
  export function readFileSync(path: URL | string, encoding: string): string;
}
