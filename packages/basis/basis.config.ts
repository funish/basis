import { defineBasisConfig } from "./src/config";

export default defineBasisConfig({
  build: {
    entries: [
      {
        entry: ["src/index.ts", "src/config.ts", "src/cli/**/*", "src/commands/**/*"],
        minify: true,
      },
    ],
  },
  extends: ["../../basis.config.ts"],
});
