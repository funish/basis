#!/usr/bin/env node

import { runMain } from "citty";
import { lintCommand } from "../commands/lint";

void runMain(lintCommand);
