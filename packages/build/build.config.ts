import { defineBuildConfig } from "./src/config";

export default defineBuildConfig({
  entries: [
    {
      entry: ["src/index", "src/config", "src/command", "src/cli"],
      minify: true,
    },
  ],
});
