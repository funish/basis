import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { dlx } from "nypm";
import { loadConfig } from "../config";

export const fmtCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "fmt",
    description: "Format code",
  },
  async run({ rawArgs }) {
    const cwd = process.cwd();

    // Load config
    const { config } = await loadConfig({ cwd });
    const configArgs = (config.fmt?.config as string[]) || [];

    // Combine config args with user args (config first, then user args to allow override)
    const args = [...configArgs, ...rawArgs];

    try {
      await dlx("oxfmt", {
        args,
        cwd,
      });

      consola.success("Formatting completed");
    } catch (error) {
      consola.error("Formatting failed:", error);
      process.exit(1);
    }
  },
});
