import assert from "node:assert";
import { DbClient, dbConnect } from "./db";
import { getUndoFilename, loadState } from "./state";
import {
  abortIfErrors,
  Args,
  checkSchemaAndTable,
  exitIfNotInitialized,
  printMigrationHistory,
  printMigrationHistoryAndUnappliedMigrations,
  sliceFromFirstNull,
} from "./utils";

export const ensureTableInitialised = async (client: DbClient) => {
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);
  if (!schemaExists) {
    await client.dbCreateSchema();
  }
  if (!tableExists) {
    await client.dbCreateEventsTable();
  }
};

export const migrateCommand = async (args: Args) => {
  const { napply, filePath } = args;
  const client = await dbConnect(args);
  await ensureTableInitialised(client);
  const state = await loadState(client, filePath);

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
    await client.dbApplyMigration(migration);
  }

  console.log(
    `All done! Applied ${migrationsToApply.length} migration${
      migrationsToApply.length === 1 ? "" : "s"
    }`
  );

  printMigrationHistoryAndUnappliedMigrations(
    await loadState(client, filePath)
  );
};

export const infoCommand = async (args: Args) => {
  const { connection, schema, filePath } = args;
  const client = await dbConnect(args);
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);

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
      await loadState(client, filePath)
    );
  }
};

export const statusCommand = async (args: Args) => {
  const { connection, schema, filePath } = args;
  const client = await dbConnect(args);
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);
  if (!schemaExists) {
    console.log("Schema does not exist");
  }

  if (!tableExists) {
    console.log(
      "Migration table has not been initialised. Run migrate to begin."
    );
  }

  if (schemaExists && tableExists) {
    printMigrationHistory(await loadState(client, filePath));
  }
};

export const validateCommand = async (args: Args) => {
  const { connection, schema, filePath } = args;
  const client = await dbConnect(args);
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);
  exitIfNotInitialized(schemaExists, tableExists);

  const state = await loadState(client, filePath);
  if (schemaExists && tableExists) {
    abortIfErrors(state);
  }
  console.log("Validation passed");

  printMigrationHistoryAndUnappliedMigrations(state);
};

export const dropCommand = async (args: Args) => {
  const { connection, schema } = args;
  const client = await dbConnect(args);
  process.stdout.write(
    `Dropping the tables, schema and migration history table... `
  );
  await client.dbDropAll();
  console.log(`done!`);
};

export const undoCommand = async (args: Args) => {
  const { connection, schema, filePath, nundo } = args;
  const client = await dbConnect(args);
  const state = await loadState(client, filePath);

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
    await client.dbApplyUndoMigration(filename, script);
  }
  console.log(
    `All done! Performed ${undosToApply.length} undo migration${
      undosToApply.length === 1 ? "" : "s"
    }`
  );

  printMigrationHistoryAndUnappliedMigrations(state);
};

export const auditCommand = async (args: Args) => {
  const { connection, schema, filePath } = args;
  const client = await dbConnect(args);
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);

  exitIfNotInitialized(schemaExists, tableExists);

  const state = await loadState(client, filePath);
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

export const getAppliedScriptCommand = async (args: Args) => {
  const { connection, schema, filePath, filename } = args;
  assert.ok(filename, "filename is required for this command");
  const client = await dbConnect(args);
  const { schemaExists, tableExists } = await checkSchemaAndTable(client);

  exitIfNotInitialized(schemaExists, tableExists);

  const state = await loadState(client, filePath);
  const script = await client.dbGetAppliedScript(state, filename);
  if (script) {
    console.log(script);
  } else {
    console.error(
      `Script for ${filename} not found, use the audit command to check all applied migrations`
    );
  }
};

export const baselineCommand = async (args: Args) => {
  const { connection, schema, filePath, filename: argvFilename } = args;
  const client = await dbConnect(args);
  await ensureTableInitialised(client);

  const state = await loadState(client, filePath);

  if (state.files.unappliedVersionedFiles.length === 0) {
    console.error("Error: No unapplied versioned migrations, aborting.");
    process.exit(1);
  }

  const filename =
    argvFilename ??
    state.files.unappliedVersionedFiles[
      state.files.unappliedVersionedFiles.length - 1
    ].filename;

  if (
    !state.files.unappliedVersionedFiles.find(
      (file) => file.filename === filename
    )
  ) {
    console.error(
      `Error: '${filename}' is not an unapplied versioned migration, aborting.`
    );
    process.exit(1);
  }

  let appliedCount = 0;
  for (const file of state.files.unappliedVersionedFiles) {
    await client.dbBaseline(file);
    appliedCount++;
    if (file.filename === filename) {
      break;
    }
  }

  console.log(
    `All done! (Shadow)-applied ${appliedCount} migrations to baseline to ${filename}`
  );
};
