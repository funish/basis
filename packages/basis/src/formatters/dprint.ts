import { execSync } from "node:child_process";
import type { FormatterDriver, FormatOptions } from "./base";

/**
 * Dprint Driver
 * https://dprint.dev/
 */
export class DprintDriver implements FormatterDriver {
  name = "dprint";
  dependencies = ["dprint"];

  async format(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      // dprint fmt 默认使用 "." (当前目录)
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`dprint fmt ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Dprint failed: ${error}`);
    }
  }

  async check(options: FormatOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`dprint check ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`Dprint check failed: ${error}`);
    }
  }
}
