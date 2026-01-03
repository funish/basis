import { execSync } from "node:child_process";
import type { FormatterDriver, FormatOptions } from "./base";

/**
 * Prettier Driver
 * https://prettier.io/
 */
export class PrettierDriver implements FormatterDriver {
  name = "prettier";
  dependencies = ["prettier"];

  async format(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      // prettier 默认使用 "." (当前目录)
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`prettier ${pathsArg} --write`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Prettier failed: ${error}`);
    }
  }

  async check(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`prettier ${pathsArg} --check`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Prettier check failed: ${error}`);
    }
  }
}
