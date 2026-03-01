import { defineCommand, type CommandDef, type ArgsDef } from "citty";
import { consola } from "consola";
import { auditDependencies, auditStructure, auditAll } from "../modules/audit";

export const auditCommand: CommandDef<ArgsDef> = defineCommand<ArgsDef>({
  meta: {
    name: "audit",
    description: "Audit code quality",
  },
  args: {
    dependencies: {
      type: "boolean",
      description: "Dependencies audit",
    },
    structure: {
      type: "boolean",
      description: "Project structure audit",
    },
    fix: {
      type: "boolean",
      description: "Auto-fix issues",
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    let success = true;

    // If no specific flags, run all audits
    const runAll = !args.dependencies && !args.structure;

    if (runAll) {
      success = await auditAll(cwd, args.fix);
    } else {
      const checks: Array<() => Promise<boolean>> = [];

      if (args.dependencies) {
        checks.push(() => auditDependencies(cwd, undefined, args.fix));
      }

      if (args.structure) {
        checks.push(() => auditStructure(cwd));
      }

      // Run selected checks
      for (const check of checks) {
        const result = await check();
        if (!result) {
          success = false;
        }
      }
    }

    if (!success) {
      consola.error("Some audits failed");
      process.exit(1);
    }
  },
});
