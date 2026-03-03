import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { runScript } from "nypm";
import { createJiti } from "jiti";
import { resolve } from "pathe";
import { existsSync } from "node:fs";
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

    // Check if it's a file path first to avoid runScript errors
    const filePath = resolve(cwd, scriptOrFile);
    const isFile = existsSync(filePath);

    if (isFile) {
      // It's a file, run with jiti directly
      try {
        const jitiInstance = createJiti(cwd, jitiOptions);

        // Use jiti.esmResolve to resolve the file path
        const resolved = jitiInstance.esmResolve(filePath);

        // Reconstruct process.argv: [node, scriptPath, ...args]
        process.argv = [process.argv[0], resolved, ...rawArgs.slice(1)];

        await jitiInstance.import(resolved);

        return;
      } catch (jitiError) {
        consola.error("Failed to run file:");
        consola.error(`  ${String(jitiError)}`);
        process.exit(1);
      }
    }

    // Not a file, try as package.json script
    try {
      await runScript(scriptOrFile, {
        cwd,
        args: scriptArgs,
      });
    } catch (error) {
      consola.error(`Failed to run script "${scriptOrFile}":`);
      consola.error(`  ${String(error)}`);
      process.exit(1);
    }
  },
});
