declare var process: any;
declare var __dirname: string;
declare var __filename: string;
declare class Buffer {}
declare function require(id: string): any;
declare namespace NodeJS { interface ErrnoException extends Error { code?: string } }
declare module "node:fs" { const x: any; export = x; }
declare module "node:path" { const x: any; export = x; }
declare module "node:crypto" { const x: any; export = x; }
declare module "node:module" { export function createRequire(filename: string): any; }
declare module "node:child_process" { export function spawnSync(command: string, args?: string[], options?: any): any; }
declare module "node:url" { export function fileURLToPath(url: string): string; }
