import { Command } from "commander";

import { outputJson, setOutputOptions } from "./output.js";

export interface GlobalCliOptions {
  json?: boolean;
  quiet?: boolean;
  noColor?: boolean;
}

export function withGlobalOptions<T extends Command>(command: T): T {
  return command
    .option("--json", "Output machine-readable JSON")
    .option("--quiet", "Suppress non-essential human-readable output")
    .option("--no-color", "Disable color output");
}

export function applyGlobalOptions(options: GlobalCliOptions | undefined): void {
  setOutputOptions({
    json: options?.json === true,
    quiet: options?.quiet === true,
    noColor: options?.noColor === true,
  });
}

export function printJsonIfNeeded(payload: unknown, options: GlobalCliOptions | undefined): boolean {
  applyGlobalOptions(options);
  if (options?.json === true) {
    outputJson(payload);
    return true;
  }

  return false;
}

export function parseCommaList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
