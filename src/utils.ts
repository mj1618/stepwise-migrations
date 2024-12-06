import fs from "fs/promises";
import gitDiff from "git-diff";
import path from "path";
import { DbClient } from "./db";
import {
  AppliedMigration,
  MigrationFile,
  MigrationState,
  MigrationType,
} from "./types";

export const usage = `
Usage: stepwise-migrations [command] [options]

Commands:
  migrate
    Migrate the database to the latest version
  undo
    Rollback the database to the previous version
  validate
    Validate the migration files and the stepwise_migration_events table
  audit
    Show the audit history for the migrations in the database
  info
    Show information about the current state of the migrations in the database
  drop
    Drop all tables, schema and stepwise_migration_events table
  get-applied-script
    Get the script for the last applied migration
  baseline
    Without applying any migrations, set the migration table state to a specific version

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations (default: public)
  --path <path>              The path to the migrations directory
  --napply                   Number of up migrations to apply (default: all)
  --nundo                    Number of undo migrations to apply (default: 1)
  --filename                 (get-applied-script) The filename to get the script for (default: last applied migration)
  --filename                 (baseline) The filename to baseline (default: last unapplied versioned migration)

Example:
  npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase\?sslmode=require \
    --schema=myschema \
    --path=./test/migrations-template/
`;

export type Args = {
  schema: string;
  command: string;
  napply: number;
  nundo: number;
  filePath: string;
  connection: string;
  filename?: string;
};

export const parseArgs = (argv: any): Args => {
  const schema = argv.schema ?? "public";
  const command = argv._[0];
  const napply = argv.napply || Infinity;
  const nundo = argv.nundo || 1;
  const filePath = argv.path;
  const connection = argv.connection;
  const filename = argv.filename;

  return {
    schema,
    command,
    napply,
    nundo,
    filePath,
    connection,
    filename,
  };
};

export const validateArgs = (args: Args) => {
  const required = ["connection", "filePath", "command"];
  if (required.some((key) => !(key in args))) {
    console.error(
      "Missing required arguments",
      required.filter((key) => !(key in args))
    );
    console.log(usage);
    process.exit(1);
  }
};

export const filenameToType = (filename: string): MigrationType => {
  if (filename.endsWith(".undo.sql")) {
    return "undo";
  } else if (filename.endsWith(".repeatable.sql")) {
    return "repeatable";
  }
  return "versioned";
};

export const readMigrationFiles = async (
  directory: string,
  appliedVersionedMigrations: AppliedMigration[]
) => {
  let errors: string[] = [];
  const files = await fs.readdir(directory, { withFileTypes: true });
  const migrationFiles = files
    .filter((file) => file.isFile() && file.name.endsWith(".sql"))
    .map((file) => path.join(directory, file.name));
  migrationFiles.sort();
  const results: MigrationFile[] = [];
  for (const fullFileName of migrationFiles) {
    const script = await fs.readFile(fullFileName, "utf8");
    results.push({
      type: filenameToType(path.basename(fullFileName)),
      filename: path.basename(fullFileName),
      script,
    });
  }

  for (const appliedMigration of appliedVersionedMigrations) {
    const file = results.find((f) => f.filename === appliedMigration.filename);
    if (
      file &&
      file.type === "versioned" &&
      file.script !== appliedMigration.script
    ) {
      errors.push(
        `Versioned migration ${
          appliedMigration.filename
        } has been altered. Cannot migrate in current state. \n\n${gitDiff(
          appliedMigration.script,
          file.script,
          {
            color: true,
          }
        )}\n\n`
      );
    }
  }

  return { files: results, errors };
};

export const printMigrationHistoryAndUnappliedMigrations = (
  state: MigrationState
) => {
  // console.log(JSON.stringify(state, null, 2));
  console.log("All applied versioned migrations:");
  console.table(
    state.current.appliedVersionedMigrations.map((h) => ({
      id: h.id,
      type: h.type,
      filename: h.filename,
      applied_by: h.applied_by,
      applied_at: h.applied_at,
    }))
  );
  if (state.current.appliedRepeatableMigrations.length > 0) {
    console.log("All applied repeatable migrations:");
    console.table(
      state.current.appliedRepeatableMigrations.map((h) => ({
        id: h.id,
        type: h.type,
        filename: h.filename,
        applied_by: h.applied_by,
        applied_at: h.applied_at,
      }))
    );
  }

  abortIfErrors(state);

  console.log("Unapplied versioned migrations:");
  console.table(
    state.files.unappliedVersionedFiles.map((h) => ({
      type: h.type,
      filename: h.filename,
    }))
  );
  if (state.files.unappliedRepeatableFiles.length > 0) {
    console.log("Unapplied repeatable migrations:");
    console.table(
      state.files.unappliedRepeatableFiles.map((h) => ({
        type: h.type,
        filename: h.filename,
      }))
    );
  }
};

export const printMigrationHistory = (state: MigrationState) => {
  console.log("All applied versioned migrations:");
  console.table(
    state.current.appliedVersionedMigrations.map((h) => ({
      id: h.id,
      type: h.type,
      filename: h.filename,
      applied_by: h.applied_by,
      applied_at: h.applied_at,
    }))
  );
  if (state.current.appliedRepeatableMigrations.length > 0) {
    console.log("All applied repeatable migrations:");
    console.table(
      state.current.appliedRepeatableMigrations.map((h) => ({
        id: h.id,
        type: h.type,
        filename: h.filename,
        applied_by: h.applied_by,
        applied_at: h.applied_at,
      }))
    );
  }
};

export const fileExists = async (path: string) => {
  try {
    return (await fs.stat(path)).isFile();
  } catch (error) {
    return false;
  }
};

export const abortIfErrors = (state: MigrationState) => {
  if (state.errors.length > 0) {
    console.error(
      `There were errors loading the migration state. Please fix the errors and try again.`
    );
    console.error(state.errors.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }
};

export const exitIfNotInitialized = (
  schemaExists: boolean,
  tableExists: boolean
) => {
  if (!schemaExists) {
    console.log("Schema does not exist. Run migrate to begin.");
    process.exit(1);
  }

  if (!tableExists) {
    console.log(
      "Migration table has not been initialised. Run migrate to begin."
    );
    process.exit(1);
  }
};

export const sliceFromFirstNull = <T>(array: (T | undefined)[]): T[] => {
  const indexOfFirstNull = array.findIndex((x) => x == null);
  return indexOfFirstNull < 0
    ? (array as T[])
    : (array.slice(0, indexOfFirstNull) as T[]);
};

export const checkSchemaAndTable = async (client: DbClient) => {
  const schemaExists = await client.dbSchemaExists();
  const tableExists = await client.dbTableExists();
  return { schemaExists, tableExists };
};
