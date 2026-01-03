export * from "./base";
export { OxfmtDriver } from "./oxfmt";
export { PrettierDriver } from "./prettier";
export { DprintDriver } from "./dprint";

/**
 * Create a formatter driver by type
 */
import type { FormatterDriver } from "./base";
import { OxfmtDriver } from "./oxfmt";
import { PrettierDriver } from "./prettier";
import { DprintDriver } from "./dprint";

export function createFormatterDriver(type: string = "oxfmt"): FormatterDriver {
  switch (type) {
    case "oxfmt":
      return new OxfmtDriver();
    case "prettier":
      return new PrettierDriver();
    case "dprint":
      return new DprintDriver();
    default:
      throw new Error(`Unknown formatter type: ${type}. Supported types: oxfmt, prettier, dprint`);
  }
}
