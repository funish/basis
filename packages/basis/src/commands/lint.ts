import { defineCommand } from "citty";
import { consola } from "consola";
import {
  lintAll,
  lintDependencies,
  lintDocs,
  lintProject,
  lintStaged,
  lintStructure,
} from "../modules/lint";

export const lint = defineCommand({
  meta: {
    name: "lint",
    description: "Run comprehensive project linting and quality checks",
  },
  args: {
    staged: {
      type: "boolean",
      description: "Lint only staged files using configured commands",
      default: false,
    },
    project: {
      type: "boolean",
      description: "Run project-wide lint commands",
      default: false,
    },
    deps: {
      type: "boolean",
      description: "Check dependencies (outdated, security, blocked packages)",
      default: false,
    },
    structure: {
      type: "boolean",
      description:
        "Check project structure (required files/dirs, naming conventions)",
      default: false,
    },
    docs: {
      type: "boolean",
      description: "Check documentation (README, CHANGELOG)",
      default: false,
    },
    all: {
      type: "boolean",
      description: "Run all lint checks",
      default: false,
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    let success = true;

    // If no specific flags are provided, run staged files lint by default
    if (
      !args.staged &&
      !args.project &&
      !args.deps &&
      !args.structure &&
      !args.docs &&
      !args.all
    ) {
      args.staged = true;
    }

    // Run all checks if --all flag is provided
    if (args.all) {
      success = await lintAll(cwd);
    } else {
      // Run specific checks based on flags
      const checks: Array<() => Promise<boolean>> = [];

      if (args.staged) {
        checks.push(() => lintStaged(cwd));
      }

      if (args.project) {
        checks.push(() => lintProject(cwd));
      }

      if (args.deps) {
        checks.push(() => lintDependencies(cwd));
      }

      if (args.structure) {
        checks.push(() => lintStructure(cwd));
      }

      if (args.docs) {
        checks.push(() => lintDocs(cwd));
      }

      // Run all selected checks
      for (const check of checks) {
        const result = await check();
        if (!result) {
          success = false;
        }
      }
    }

    if (success) {
      consola.success("✅ All lint checks completed successfully!");
      process.exit(0);
    } else {
      consola.error("❌ Some lint checks failed");
      process.exit(1);
    }
  },
});
