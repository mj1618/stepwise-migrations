import { PoolClient } from "pg";
import {
  applyMigration,
  applyUndoMigration,
  dbCreateEventsTable,
  dbCreateSchema,
  dbDropAll,
  dbGetAppliedScript,
} from "./db";
import { getUndoFilename, loadState } from "./state";
import {
  abortIfErrors,
  checkSchemaAndTable,
  exitIfNotInitialized,
  parseArgs,
  printMigrationHistory,
  printMigrationHistoryAndUnappliedMigrations,
  sliceFromFirstNull,
} from "./utils";

export const migrateCommand = async (client: PoolClient, argv: any) => {
  const { schema, napply, filePath } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );

  if (!schemaExists) {
    await dbCreateSchema(client, schema);
  }
  if (!tableExists) {
    await dbCreateEventsTable(client, schema);
  }

  const state = await loadState(client, schema, filePath);

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
};

export const infoCommand = async (client: PoolClient, argv: any) => {
  const { schema, filePath } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );

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
};

export const statusCommand = async (client: PoolClient, argv: any) => {
  const { schema, filePath } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );
  if (!schemaExists) {
    console.log("Schema does not exist");
  }

  if (!tableExists) {
    console.log(
      "Migration table has not been initialised. Run migrate to begin."
    );
  }

  if (schemaExists && tableExists) {
    printMigrationHistory(await loadState(client, schema, filePath));
  }
};

export const validateCommand = async (client: PoolClient, argv: any) => {
  const { schema } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );
  exitIfNotInitialized(schemaExists, tableExists);

  const state = await loadState(client, schema, argv.path);
  if (schemaExists && tableExists) {
    abortIfErrors(state);
  }
  console.log("Validation passed");

  printMigrationHistoryAndUnappliedMigrations(state);
};

export const dropCommand = async (client: PoolClient, argv: any) => {
  const { schema } = parseArgs(argv);
  process.stdout.write(
    `Dropping the tables, schema and migration history table... `
  );
  await dbDropAll(client, schema);
  console.log(`done!`);
};

export const undoCommand = async (client: PoolClient, argv: any) => {
  const { schema, nundo, filePath } = parseArgs(argv);
  const state = await loadState(client, schema, filePath);

  abortIfErrors(state);

  const reversedAppliedVersionedMigrations =
    state.current.appliedVersionedMigrations.slice().reverse();

  const undosToApplyAll = reversedAppliedVersionedMigrations.map((migration) =>
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
};

export const auditCommand = async (client: PoolClient, argv: any) => {
  const { schema } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );

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
};

export const getAppliedScriptCommand = async (
  client: PoolClient,
  argv: any
) => {
  const { schema } = parseArgs(argv);
  const { schemaExists, tableExists } = await checkSchemaAndTable(
    client,
    schema
  );

  exitIfNotInitialized(schemaExists, tableExists);

  const state = await loadState(client, schema, argv.path);
  const script = await dbGetAppliedScript(state, argv.filename);
  if (script) {
    console.log(script);
  } else {
    console.error(
      `Script for ${argv.filename} not found, use the audit command to check all applied migrations`
    );
  }
};
