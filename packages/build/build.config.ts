import { defineBuildConfig } from "./src/config";

export default defineBuildConfig({
  entries: [
    {
      type: "bundle",
      input: ["src/index", "src/cli", "src/config"],
      minify: true,
    },
  ],
});
