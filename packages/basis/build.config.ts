import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["src/index", "src/config", "src/cli/basis", "src/cli/oxlint", "src/cli/oxfmt"],
      minify: true,
    },
    {
      type: "transform",
      input: "src/commands/",
      outDir: "dist/commands/",
      minify: true,
    },
  ],
});
