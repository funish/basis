export * from "./base";
export { OxLintDriver } from "./oxlint";
export { ESLintDriver } from "./eslint";
export { TscDriver } from "./tsc";

/**
 * Create a linter driver by type
 */
import type { LinterDriver } from "./base";
import { OxLintDriver } from "./oxlint";
import { ESLintDriver } from "./eslint";
import { TscDriver } from "./tsc";

export function createLinterDriver(type: string = "oxlint"): LinterDriver {
  switch (type) {
    case "oxlint":
      return new OxLintDriver();
    case "eslint":
      return new ESLintDriver();
    case "tsc":
      return new TscDriver();
    default:
      throw new Error(`Unknown linter type: ${type}. Supported types: oxlint, eslint, tsc`);
  }
}
