import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      entry: ["src/index", "src/config", "src/cli/**/*", "src/commands/**/*"],
      minify: true,
    },
  ],
});
