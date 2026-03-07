import { execSync as nodeExecSync } from "node:child_process";
import type { ExecSyncOptions } from "node:child_process";
import { detectShell } from "./utils";

/**
 * Enhanced execSync with automatic shell detection for cross-platform compatibility
 *
 * @param command - The command to run
 * @param options - Options for execSync
 * @returns The stdout from the command
 *
 * @example
 * ```ts
 * import { execSync } from "@funish/process";
 *
 * // Simple execution (auto-detects shell on Windows)
 * const output = execSync("bun --version", { encoding: "utf8" });
 *
 * // With options
 * execSync("npm install", { cwd: "./project", stdio: "inherit" });
 *
 * // With explicit shell
 * execSync("ls -la", { shell: "/bin/bash" });
 * ```
 */
export function execSync(command: string, options?: ExecSyncOptions): string | Buffer {
  const shell = options?.shell ?? detectShell();

  return nodeExecSync(command, {
    ...options,
    shell,
  }) as string | Buffer;
}
