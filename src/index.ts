#!/usr/bin/env node

import yargs from "yargs";
import {
  dbConnect,
  dbCreateHistoryTable,
  dbCreateSchema,
  dbHistorySchemaExists,
  dbMigrationHistory,
  dbTableExists,
} from "./db";
import { applyMigration, validateMigrationFiles } from "./migrate";
import { readMigrationFiles, validateArgs } from "./utils";

const main = async () => {
  const argv: any = yargs(process.argv.slice(2)).argv;

  validateArgs(argv);

  const schema = argv.schema;
  const command = argv._[0];

  const client = await dbConnect(argv);
  const historySchemaExists = await dbHistorySchemaExists(client, schema);
  const tableExists = await dbTableExists(client, schema);

  if (command === "migrate") {
    if (!historySchemaExists) {
      await dbCreateSchema(client, schema);
    }
    if (!tableExists) {
      await dbCreateHistoryTable(client, schema);
    }

    const migrationHistory = await dbMigrationHistory(client, schema);
    const migrationFiles = await readMigrationFiles(argv.path);
    console.log(`Found ${migrationFiles.length} migration files`);

    validateMigrationFiles(migrationFiles, migrationHistory);

    const migrationsToApply = migrationFiles.slice(migrationHistory.length);

    for (const { filename, contents, hash } of migrationsToApply) {
      await applyMigration(client, schema, filename, contents, hash);
    }
    console.log("\nAll done!");
  } else if (command === "info") {
    console.log(
      "Showing information about the current state of the migrations in the database"
    );
    console.log(
      historySchemaExists ? "Schema exists" : "Schema does not exist"
    );
    console.log(
      tableExists
        ? "Migration history table exists"
        : "Migration history table does not exist"
    );
    console.log("Migration history:");
    console.table(await dbMigrationHistory(client, schema));
  } else if (command === "drop") {
    console.log("Dropping the tables, schema and migration history table");
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    console.log("\nAll done!");
  }

  client.release();
  process.exit(0);
};

main();
