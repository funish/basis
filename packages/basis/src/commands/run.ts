import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { runScript } from "nypm";
import { createJiti } from "jiti";
import { resolve } from "pathe";
import { existsSync } from "node:fs";
import { loadConfig } from "../utils";

export const runCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "run",
    description: "Run scripts or files",
  },
  async run({ rawArgs }) {
    if (rawArgs.length === 0) {
      consola.error("Script name or file path required");
      process.exit(1);
    }

    const [scriptOrFile, ...scriptArgs] = rawArgs;
    const cwd = process.cwd();

    const { config } = await loadConfig();
    const jitiOptions = config.run?.config;

    const filePath = resolve(cwd, scriptOrFile);
    const isFile = existsSync(filePath);

    if (isFile) {
      try {
        const jitiInstance = createJiti(cwd, jitiOptions);
        const resolved = jitiInstance.esmResolve(filePath);
        process.argv = [process.argv[0], resolved, ...rawArgs.slice(1)];
        await jitiInstance.import(resolved);
        return;
      } catch (jitiError) {
        consola.error("Failed to run file:", jitiError);
        process.exit(1);
      }
    }

    try {
      await runScript(scriptOrFile, { cwd, args: scriptArgs });
    } catch (error) {
      consola.error(`Failed to run script "${scriptOrFile}":`, error);
      process.exit(1);
    }
  },
});
