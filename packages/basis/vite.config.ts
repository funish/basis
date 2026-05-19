import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/config.ts", "src/cli/**/*", "src/commands/**/*"],
    minify: true,
  },
});
