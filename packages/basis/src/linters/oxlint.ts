import { execSync } from "node:child_process";
import type { LinterDriver, LinterOptions } from "./base";

/**
 * OxLint Driver
 * https://oxc-project.github.io/
 */
export class OxLintDriver implements LinterDriver {
  name = "oxlint";
  dependencies = ["oxlint"];

  async lint(options: LinterOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      // 如果没有指定路径，不传路径参数，让 oxlint 使用默认行为
      // oxlint 默认会：
      // - 尊重 .gitignore
      // - 忽略 node_modules
      // - 检查当前目录所有相关文件
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`oxlint ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`OxLint failed: ${error}`);
    }
  }

  async fix(options: LinterOptions = {}): Promise<void> {
    const { paths } = options;

    try {
      const pathsArg = paths && paths.length > 0 ? paths.join(" ") : ".";
      execSync(`oxlint --fix ${pathsArg}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      throw new Error(`OxLint fix failed: ${error}`);
    }
  }
}
