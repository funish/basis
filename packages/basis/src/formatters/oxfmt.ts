import { execSync } from "node:child_process";
import type { FormatterDriver, FormatOptions } from "./base";

/**
 * Oxfmt Driver
 * https://oxc-project.github.io/
 */
export class OxfmtDriver implements FormatterDriver {
  name = "oxfmt";
  dependencies = ["oxfmt"];

  async format(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      // oxfmt 默认使用 "." (当前目录)
      // 自动尊重 .gitignore 和忽略 node_modules
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`oxfmt ${pathsArg} --write`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Oxfmt failed: ${error}`);
    }
  }

  async check(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`oxfmt ${pathsArg} --check`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Oxfmt check failed: ${error}`);
    }
  }
}
