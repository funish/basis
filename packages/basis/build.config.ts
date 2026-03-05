import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      entry: ["src/index.ts", "src/config.ts", "src/cli/**/*", "src/commands/**/*"],
      minify: true,
    },
  ],
});
