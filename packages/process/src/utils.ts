import { isWindows, hasTTY } from "std-env";

/**
 * Detect the appropriate shell for the current environment
 *
 * @returns Shell command or undefined to use default
 *
 * @example
 * ```ts
 * import { detectShell } from "@funish/process/utils";
 *
 * const shell = detectShell();
 * console.log(shell); // "powershell.exe" on Windows PowerShell, undefined otherwise
 * ```
 */
export function detectShell(): string | undefined {
  // Windows: check if running in PowerShell
  if (isWindows) {
    // Check if running in PowerShell using std-env or environment variables
    const isPowerShell =
      process.env.PSModulePath !== undefined ||
      process.env.PROMPT?.startsWith("PS") ||
      !hasTTY; // PowerShell ISE doesn't have TTY

    if (isPowerShell) {
      return "powershell.exe";
    }
    // Fall back to undefined (use default shell)
    return undefined;
  }

  // Unix/Linux/macOS: return undefined (use default shell)
  return undefined;
}
