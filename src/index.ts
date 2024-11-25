#!/usr/bin/env node

import yargs from "yargs";
import {
  applyMigration,
  applyUndoMigration,
  dbConnect,
  dbCreateEventsTable,
  dbCreateSchema,
  dbDropAll,
  dbGetAppliedScript,
  dbSchemaExists,
  dbTableExists,
} from "./db";
import { getUndoFilename, loadState } from "./state";
import {
  abortIfErrors,
  exitIfNotInitialized,
  printMigrationHistoryAndUnappliedMigrations,
  sliceFromFirstNull,
  usage,
  validateArgs,
} from "./utils";

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
    if (!schemaExists) {
      await dbCreateSchema(client, schema);
    }
    if (!tableExists) {
      await dbCreateEventsTable(client, schema);
    }

    const state = await loadState(client, schema, argv.path);

    abortIfErrors(state);

    if (
      state.files.unappliedVersionedFiles.length === 0 &&
      state.files.unappliedRepeatableFiles.length === 0
    ) {
      console.log("All migrations are already applied");
      process.exit(0);
    }

    const migrationsToApply = [
      ...state.files.unappliedVersionedFiles,
      ...state.files.unappliedRepeatableFiles,
    ].slice(0, napply);

    for (const migration of migrationsToApply) {
      await applyMigration(client, schema, migration);
    }

    console.log(
      `All done! Applied ${migrationsToApply.length} migration${
        migrationsToApply.length === 1 ? "" : "s"
      }`
    );

    printMigrationHistoryAndUnappliedMigrations(
      await loadState(client, schema, filePath)
    );
  } else if (command === "info") {
    if (!schemaExists) {
      console.log("Schema does not exist");
    }

    if (!tableExists) {
      console.log(
        "Migration table has not been initialised. Run migrate to begin."
      );
    }

    if (schemaExists && tableExists) {
      printMigrationHistoryAndUnappliedMigrations(
        await loadState(client, schema, filePath)
      );
    }
  } else if (command === "status") {
    if (!schemaExists) {
      console.log("Schema does not exist");
    }

    if (!tableExists) {
      console.log(
        "Migration table has not been initialised. Run migrate to begin."
      );
    }

    if (schemaExists && tableExists) {
      printMigrationHistoryAndUnappliedMigrations(
        await loadState(client, schema, filePath)
      );
    }
  } else if (command === "validate") {
    exitIfNotInitialized(schemaExists, tableExists);

    const state = await loadState(client, schema, argv.path);
    if (schemaExists && tableExists) {
      abortIfErrors(state);
    }
    console.log("Validation passed");

    printMigrationHistoryAndUnappliedMigrations(state);
  } else if (command === "drop") {
    process.stdout.write(
      `Dropping the tables, schema and migration history table... `
    );
    await dbDropAll(client, schema);
    console.log(`done!`);
  } else if (command === "undo") {
    const state = await loadState(client, schema, filePath);

    abortIfErrors(state);

    const reversedAppliedVersionedMigrations =
      state.current.appliedVersionedMigrations.slice().reverse();

    const undosToApplyAll = reversedAppliedVersionedMigrations.map(
      (migration) =>
        state.files.undoFiles.find(
          (file) => file.filename === getUndoFilename(migration.filename)
        )
    );

    const undosToApply = sliceFromFirstNull(undosToApplyAll).slice(0, nundo);

    if (undosToApply.length < nundo) {
      console.error(
        `Error: not enough sequential (from last) undo migrations to apply ${nundo} undos.`
      );
      process.exit(1);
    }

    for (const { filename, script } of undosToApply) {
      await applyUndoMigration(client, schema, filename, script);
    }
    console.log(
      `All done! Performed ${undosToApply.length} undo migration${
        undosToApply.length === 1 ? "" : "s"
      }`
    );

    printMigrationHistoryAndUnappliedMigrations(state);
  } else if (command === "audit") {
    exitIfNotInitialized(schemaExists, tableExists);

    const state = await loadState(client, schema, argv.path);
    console.log("Event history:");
    console.table(
      state.events.map((row) => ({
        id: row.id,
        type: row.type,
        filename: row.filename,
        applied_by: row.applied_by,
        applied_at: row.applied_at,
      }))
    );
  } else if (command === "get-applied-script") {
    if (!schemaExists) {
      console.log("Schema does not exist");
      process.exit(1);
    }

    if (!tableExists) {
      console.log(
        "Migration table has not been initialised. Run migrate to begin."
      );
      process.exit(1);
    }

    const state = await loadState(client, schema, argv.path);
    const script = await dbGetAppliedScript(state, argv.filename);
    if (script) {
      console.log(script);
    } else {
      console.error(
        `Script for ${argv.filename} not found, use the audit command to check all applied migrations`
      );
    }
  } else {
    console.error(`Invalid command: ${command}`);
    console.log(usage);
    process.exit(1);
  }

  client.release();
  process.exit(0);
};

main();
