import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { dlx } from "nypm";
import { loadConfig } from "../config";

export const lintCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "lint",
    description: "Lint code",
  },
  async run({ rawArgs }) {
    const cwd = process.cwd();

    // Load config (will automatically search upward)
    const { config } = await loadConfig();
    const configArgs = (config.lint?.config as string[]) || [];

    // Combine config args with user args (config first, then user args to allow override)
    const args = [...configArgs, ...rawArgs];

    try {
      await dlx("oxlint", {
        args,
        cwd,
      });

      consola.success("Linting completed");
    } catch (error) {
      consola.error("Linting failed:", error);
      process.exit(1);
    }
  },
});
