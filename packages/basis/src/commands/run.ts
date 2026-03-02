import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { runScript } from "nypm";
import { createJiti } from "jiti";
import { loadConfig } from "../config";

export const runCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "run",
    description: "Run scripts or files",
  },
  async run({ rawArgs }) {
    if (rawArgs.length === 0) {
      consola.error("Please specify a script name or file path");
      process.exit(1);
    }

    const [scriptOrFile, ...scriptArgs] = rawArgs;
    const cwd = process.cwd();

    // Load config for jiti options (will automatically search upward)
    const { config } = await loadConfig();
    const jitiOptions = config.run?.config;

    // Try runScript first (package.json script)
    try {
      await runScript(scriptOrFile, {
        cwd,
        args: scriptArgs,
      });
      return;
    } catch (error) {
      // If runScript fails, try jiti (file path)
      try {
        const jitiInstance = createJiti(cwd, jitiOptions);
        await jitiInstance.import(scriptOrFile);
        return;
      } catch (jitiError) {
        // Both failed, report error
        consola.error("Run failed:");
        consola.error(`  runScript error: ${String(error)}`);
        consola.error(`  jiti error: ${String(jitiError)}`);
        consola.info(
          `\nTried to run "${scriptOrFile}" as both a package.json script and a file, but both failed.`,
        );
        process.exit(1);
      }
    }
  },
});
