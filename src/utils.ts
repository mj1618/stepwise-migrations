import fs from "fs/promises";
import gitDiff from "git-diff";
import path from "path";
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
  down
    Rollback the database to the previous version
  info
    Show information about the current state of the migrations in the database
  drop
    Drop the tables, schema and migration history table

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations
  --path <path>              The path to the migrations directory
  --ssl true/false           Whether to use SSL for the connection (default: false)
  --napply                      Number of up migrations to apply (default: all)
  --nundo                    Number of undo migrations to apply (default: 1)

Example:
  npx stepwise-migrations migrate \\
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \\
    --schema=myschema \\
    --path=./db/migration/
`;

export const validateArgs = (argv: any) => {
  const required = ["connection", "schema", "path", "_"];
  if (required.some((key) => !(key in argv))) {
    console.error(
      "Missing required arguments",
      required.filter((key) => !(key in argv))
    );
    console.log(usage);
    process.exit(1);
  }
  if (argv._.length !== 1) {
    console.error(`Invalid number of arguments: ${argv._.length}`);
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
