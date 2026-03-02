import { defineBuildConfig } from "@funish/build/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["src/index", "src/cli", "src/config"],
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
