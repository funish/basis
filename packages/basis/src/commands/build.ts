import { buildCommand as isbuildCommand } from "@funish/build/command";

export const buildCommand = {
  ...isbuildCommand,
  meta: {
    name: "build",
    description: "Build project using @funish/build",
    version: "",
  },
};
