import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { loadConfig } from "../utils";
import { runTool } from "../modules/run";

export const fmtCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "fmt",
    description: "Format code",
  },
  async run({ rawArgs }) {
    // Load config (will automatically search upward)
    const { config } = await loadConfig();
    const configArgs = (config.fmt?.config as string[]) || [];

    // Use rawArgs if provided, otherwise use config args
    const args = rawArgs.length > 0 ? rawArgs : configArgs;

    const result = runTool({
      pkg: "oxfmt",
      bin: "cli.js",
      args,
    });

    if (result.status !== 0) {
      process.exit(1);
    }
  },
});
