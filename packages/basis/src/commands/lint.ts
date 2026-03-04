import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { loadConfig } from "../config";
import { runTool } from "../modules/run";

export const lintCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "lint",
    description: "Lint code",
  },
  async run({ rawArgs }) {
    // Load config (will automatically search upward)
    const { config } = await loadConfig();
    const configArgs = (config.lint?.config as string[]) || [];

    // Use rawArgs if provided, otherwise use config args
    const args = rawArgs.length > 0 ? rawArgs : configArgs;

    const result = runTool({
      pkg: "oxlint",
      bin: "cli.js",
      args,
    });

    if (result.status !== 0) {
      process.exit(1);
    }
  },
});
