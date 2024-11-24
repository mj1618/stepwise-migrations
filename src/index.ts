#!/usr/bin/env node

import yargs from "yargs";
import {
  applyDownMigration,
  applyMigration,
  dbAuditHistory,
  dbConnect,
  dbCreateHistoryTable,
  dbCreateSchema,
  dbGetScript,
  dbHistorySchemaExists,
  dbMigrationHistory,
  dbTableExists,
} from "./db";
import {
  printMigrationHistory,
  printMigrationHistoryAndUnappliedMigrations,
  readDownMigrationFiles,
  readMigrationFiles,
  usage,
  validateArgs,
} from "./utils";
import { validateMigrationFiles } from "./validate";

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

    validateMigrationFiles(migrationFiles, migrationHistory);

    if (migrationFiles.length === migrationHistory.length) {
      console.log("All migrations are already applied");
      process.exit(0);
    }

    const migrationsToApply = migrationFiles.slice(
      migrationHistory.length,
      migrationHistory.length + nUp
    );

    for (const { filename, script } of migrationsToApply) {
      await applyMigration(client, schema, filename, script);
    }

    console.log(`All done! Applied ${migrationsToApply.length} migrations`);

    printMigrationHistoryAndUnappliedMigrations(
      await readMigrationFiles(argv.path),
      await dbMigrationHistory(client, schema)
    );
  } else if (command === "info") {
    if (!historySchemaExists) {
      console.log("Schema does not exist");
    }

    if (!tableExists) {
      console.log("Migration history table does not exist");
    }

    if (historySchemaExists && tableExists) {
      printMigrationHistory(await dbMigrationHistory(client, schema));
    }
  } else if (command === "validate") {
    if (!historySchemaExists) {
      console.log("Schema does not exist");
    }

    if (!tableExists) {
      console.log("Migration history table does not exist");
    }

    if (historySchemaExists && tableExists) {
      validateMigrationFiles(
        await readMigrationFiles(argv.path),
        await dbMigrationHistory(client, schema)
      );
    }
    console.log("Validation passed");

    printMigrationHistoryAndUnappliedMigrations(
      await readMigrationFiles(argv.path),
      await dbMigrationHistory(client, schema)
    );
  } else if (command === "drop") {
    process.stdout.write(
      `Dropping the tables, schema and migration history table... `
    );
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    console.log(`done!`);
  } else if (command === "down") {
    const nDown = argv.ndown || 1;

    const migrationHistory = await dbMigrationHistory(client, schema);
    validateMigrationFiles(
      await readMigrationFiles(argv.path),
      migrationHistory
    );

    const reverseMigrationHistory = migrationHistory.reverse().slice(0, nDown);
    const downMigrationFilesToApply = await readDownMigrationFiles(
      argv.path,
      reverseMigrationHistory
    );

    for (const { filename, script, upFilename } of downMigrationFilesToApply) {
      await applyDownMigration(client, schema, filename, script, upFilename);
    }
    console.log(
      `All done! Applied ${downMigrationFilesToApply.length} down migration${
        downMigrationFilesToApply.length === 1 ? "" : "s"
      }`
    );

    printMigrationHistoryAndUnappliedMigrations(
      await readMigrationFiles(argv.path),
      await dbMigrationHistory(client, schema)
    );
  } else if (command === "audit") {
    const auditHistory = await dbAuditHistory(client, schema);
    console.log("Audit history:");
    console.table(
      auditHistory.map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        applied_by: row.applied_by,
        applied_at: row.applied_at,
      }))
    );
  } else if (command === "get-script") {
    const script = await dbGetScript(client, schema, argv.filename);
    console.log(script);
  } else {
    console.error(`Invalid command: ${argv._[0]}`);
    console.log(usage);
    process.exit(1);
  }

  client.release();
  process.exit(0);
};

main();
