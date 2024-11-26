#!/usr/bin/env node

import yargs from "yargs";
import {
  auditCommand,
  dropCommand,
  getAppliedScriptCommand,
  infoCommand,
  migrateCommand,
  statusCommand,
  undoCommand,
  validateCommand,
} from "./commands";
import { dbConnect, dbSchemaExists, dbTableExists } from "./db";
import { usage, validateArgs } from "./utils";

const main = async () => {
  const argv: any = yargs(process.argv.slice(2)).argv;

  validateArgs(argv);

  const schema = argv.schema;
  const command = argv._[0];
  const napply = argv.napply || Infinity;
  const nundo = argv.nundo || 1;
  const filePath = argv.path;

  const client = await dbConnect(argv);
  const schemaExists = await dbSchemaExists(client, schema);
  const tableExists = await dbTableExists(client, schema);

  if (command === "migrate") {
    await migrateCommand(client, argv);
  } else if (command === "info") {
    await infoCommand(client, argv);
  } else if (command === "status") {
    await statusCommand(client, argv);
  } else if (command === "validate") {
    await validateCommand(client, argv);
  } else if (command === "drop") {
    await dropCommand(client, argv);
  } else if (command === "undo") {
    await undoCommand(client, argv);
  } else if (command === "audit") {
    await auditCommand(client, argv);
  } else if (command === "get-applied-script") {
    await getAppliedScriptCommand(client, argv);
  } else {
    console.error(`Invalid command: ${command}`);
    console.log(usage);
    process.exit(1);
  }

  client.release();
  process.exit(0);
};

main();
