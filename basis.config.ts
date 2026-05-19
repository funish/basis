import { defineBasisConfig } from "./packages/basis/src/config";

export default defineBasisConfig({
  release: {
    npm: {
      additionalTag: "edge",
    },
  },
});
