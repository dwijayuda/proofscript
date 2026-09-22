import { KernelResourceError } from "./KernelError";

export interface FuelConfig { maxDepth: number; maxSteps: number; }
export const defaultFuelConfig: FuelConfig = { maxDepth: 2_000, maxSteps: 50_000 };

export class FuelMeter {
  private steps = 0;
  constructor(readonly config: FuelConfig = defaultFuelConfig) {}
  tick(label: string): void {
    this.steps += 1;
    if (this.steps > this.config.maxSteps) throw new KernelResourceError(`kernel fuel exhausted during ${label}`);
  }
  guardDepth(depth: number, label: string): void {
    if (depth > this.config.maxDepth) throw new KernelResourceError(`kernel recursion depth exceeded during ${label}`);
  }
}

export const portStatus_PSKernel_FuelConfig = {
  source: "PSKernel/FuelConfig.lean",
  target: "packages/kernel/src/PSKernel/FuelConfig.ts",
  status: "partial",
  trustedBoundary: true,
  proofStatus: "not-proven",
} as const;
