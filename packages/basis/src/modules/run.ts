import { createRequire } from "node:module";
import { dirname, resolve } from "pathe";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { consola } from "consola";

export interface RunToolOptions {
  pkg: string;
  bin: string;
  args: string[];
}

/**
 * Run Node.js CLI tool
 */
export function runTool(opts: RunToolOptions): SpawnSyncReturns<Buffer> {
  const { pkg, bin, args } = opts;
  const require = createRequire(import.meta.url);
  const entry = require.resolve(pkg);
  const dir = dirname(entry);
  const cli = resolve(dir, bin);

  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    consola.error(result.error);
  }

  if (result.status !== 0) {
    consola.error(`${pkg} failed with exit code ${result.status}`);
  }

  return result;
}
