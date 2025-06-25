import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  declaration: true,
  entries: ["src/index", "src/cli", "src/config"],
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
  },
});
