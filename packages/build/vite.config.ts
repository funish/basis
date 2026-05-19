import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/config.ts", "src/cli.ts", "src/command.ts"],
    minify: true,
  },
});
