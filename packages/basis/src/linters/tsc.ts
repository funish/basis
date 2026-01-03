import { execSync } from "node:child_process";
import type { LinterDriver, LinterOptions } from "./base";

/**
 * TypeScript specific options
 */
export interface TscOptions extends LinterOptions {
  /**
   * Skip type checking of declaration files
   * @default false
   */
  skipLibCheck?: boolean;

  /**
   * Additional TypeScript compiler options
   */
  tsconfig?: string;
}

/**
 * TypeScript Compiler Driver
 * https://www.typescriptlang.org/
 */
export class TscDriver implements LinterDriver {
  name = "tsc";
  dependencies = ["typescript"];

  async lint(options: TscOptions = {}): Promise<void> {
    const { skipLibCheck = true } = options;

    try {
      const args = ["tsc", "--noEmit"];

      if (skipLibCheck) {
        args.push("--skipLibCheck");
      }

      execSync(args.join(" "), {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`TypeScript check failed: ${error}`);
    }
  }

  /**
   * TSC does not support auto-fix
   */
  async fix(): Promise<void> {
    throw new Error(
      "TypeScript compiler does not support auto-fix. Please fix type errors manually.",
    );
  }
}
