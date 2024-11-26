#!/usr/bin/env node

import yargs from "yargs";
import {
  auditCommand,
  baselineCommand,
  dropCommand,
  getAppliedScriptCommand,
  infoCommand,
  migrateCommand,
  statusCommand,
  undoCommand,
  validateCommand,
} from "./commands";
import { parseArgs, usage, validateArgs } from "./utils";

const main = async () => {
  const argv: any = yargs(process.argv.slice(2)).argv;

  const args = parseArgs(argv);
  validateArgs(args);

  const command = args.command;

  if (command === "migrate") {
    await migrateCommand(args);
  } else if (command === "info") {
    await infoCommand(args);
  } else if (command === "status") {
    await statusCommand(args);
  } else if (command === "validate") {
    await validateCommand(args);
  } else if (command === "drop") {
    await dropCommand(args);
  } else if (command === "undo") {
    await undoCommand(args);
  } else if (command === "audit") {
    await auditCommand(args);
  } else if (command === "get-applied-script") {
    await getAppliedScriptCommand(args);
  } else if (command === "baseline") {
    await baselineCommand(args);
  } else {
    console.error(`Invalid command: ${command}`);
    console.log(usage);
    process.exit(1);
  }

  process.exit(0);
};

main();
