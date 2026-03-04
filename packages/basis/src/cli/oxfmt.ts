#!/usr/bin/env node

import { runMain } from "citty";
import { fmtCommand } from "../commands/fmt";

void runMain(fmtCommand);
