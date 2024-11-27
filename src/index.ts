#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
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
import { parseArgs, usage } from "./utils";
const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .command(
      "migrate",
      "Migrate the database to the latest version",
      (yargs) => {
        return yargs.options({
          napply: {
            type: "number",
            describe: "Number of migrations to apply, defaults to all",
          },
        });
      }
    )
    .command(
      "validate",
      "Validate the migration files and the stepwise_migration_events table"
    )
    .command(
      "info",
      "Show information about the current state of the migrations in the database and in the migration files"
    )
    .command(
      "status",
      "Only show the status of the migrations in the database, not the migration files"
    )
    .command(
      "undo",
      "Rollback the database to the previous version",
      (yargs) => {
        return yargs.options({
          nundo: {
            type: "number",
            describe: "Number of migrations to undo, defaults to 1",
          },
        });
      }
    )
    .command(
      "get-applied-script",
      "Get the script for the last applied migration",
      (yargs) => {
        return yargs.options({
          filename: {
            type: "string",
            describe: "The filename to get the script for",
          },
        });
      }
    )
    .command("drop", "Drop the tables, schema and migration history table")
    .command(
      "baseline",
      "Without applying any migrations, set the migration table state to a specific version",
      (yargs) => {
        return yargs.options({
          filename: {
            type: "string",
            describe: "The filename to baseline to",
            default: null,
          },
        });
      }
    )
    .options({
      connection: {
        type: "string",
        demandOption: true,
        alias: "c",
        describe: "The connection string to use to connect to the database",
      },
      schema: {
        type: "string",
        default: "public",
        alias: "s",
        describe: "The schema to use for the migrations",
      },
      ssl: {
        type: "boolean",
        default: false,
        describe: "Whether to use SSL for the connection",
      },
      path: {
        type: "string",
        default: "./",
        alias: "p",
        describe: "The path to the migrations directory",
      },
    })
    .example([
      [
        `npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./test/migrations-template/`,
        "Migrate the database to the latest version",
      ],
    ])
    .demandCommand(1)
    .recommendCommands()
    .strict()
    .help()
    .version(false)
    .parse();

  const args = parseArgs(argv);
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
