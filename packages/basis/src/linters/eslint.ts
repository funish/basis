import { execSync } from "node:child_process";
import type { LinterDriver, LinterOptions } from "./base";

/**
 * ESLint Driver
 * https://eslint.org/
 */
export class ESLintDriver implements LinterDriver {
  name = "eslint";
  dependencies = ["eslint"];

  async lint(options: LinterOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      // ESLint 默认使用 "." (当前目录)
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`eslint ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`ESLint failed: ${error}`);
    }
  }

  async fix(options: LinterOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`eslint --fix ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`ESLint fix failed: ${error}`);
    }
  }
}
