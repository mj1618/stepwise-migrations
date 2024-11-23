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
import {
  applyDownMigration,
  applyMigration,
  validateDownMigrationFiles,
  validateMigrationFiles,
} from "./migrate";
import {
  readDownMigrationFiles,
  readMigrationFiles,
  validateArgs,
} from "./utils";

const main = async () => {
  const argv: any = yargs(process.argv.slice(2)).argv;

  validateArgs(argv);

  const schema = argv.schema;
  const command = argv._[0];

  const client = await dbConnect(argv);
  const historySchemaExists = await dbHistorySchemaExists(client, schema);
  const tableExists = await dbTableExists(client, schema);

  if (command === "migrate") {
    const nUp = argv.nup || Infinity;
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

    const migrationsToApply = migrationFiles.slice(
      migrationHistory.length,
      migrationHistory.length + nUp
    );

    for (const { filename, contents, hash } of migrationsToApply) {
      await applyMigration(client, schema, filename, contents, hash);
    }

    console.log("All done!");
    console.log("New migration history:");
    console.table(await dbMigrationHistory(client, schema));
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
    console.log("All done!");
  } else if (command === "down") {
    const nDown = argv.ndown || 1;

    const migrationHistory = await dbMigrationHistory(client, schema);
    validateMigrationFiles(
      await readMigrationFiles(argv.path),
      migrationHistory,
      false
    );

    const reverseMigrationHistory = migrationHistory.reverse().slice(0, nDown);
    const downMigrationFilesToApply = await readDownMigrationFiles(
      argv.path,
      reverseMigrationHistory
    );

    validateDownMigrationFiles(
      downMigrationFilesToApply,
      reverseMigrationHistory
    );
    for (const {
      filename,
      contents,
      upFilename,
    } of downMigrationFilesToApply) {
      await applyDownMigration(client, schema, filename, contents, upFilename);
    }
    console.log("All done!");
    console.log("New migration history:");
    console.table(await dbMigrationHistory(client, schema));
  }

  client.release();
  process.exit(0);
};

main();
