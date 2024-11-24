import fs from "fs/promises";
import path from "path";
import { MigrationRow } from "./types";

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
  --nup                      Number of up migrations to apply (default: all)
  --ndown                    Number of down migrations to apply (default: 1)

Example:
  npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
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

export const readMigrationFiles = async (directory: string) => {
  const files = await fs.readdir(directory, { withFileTypes: true });
  const migrationFiles = files
    .filter(
      (file) =>
        file.isFile() &&
        file.name.endsWith(".sql") &&
        !file.name.endsWith(".down.sql")
    )
    .map((file) => path.join(directory, file.name));
  migrationFiles.sort();
  const results: {
    type: "up";
    fullFilePath: string;
    filename: string;
    script: string;
  }[] = [];
  for (const fullFilePath of migrationFiles) {
    const script = await fs.readFile(fullFilePath, "utf8");

    results.push({
      type: "up",
      fullFilePath,
      filename: path.basename(fullFilePath),
      script,
    });
  }
  return results;
};

export const printMigrationHistoryAndUnappliedMigrations = (
  migrationFiles: { filename: string }[],
  migrationHistory: MigrationRow[]
) => {
  console.log("Migration history:");
  console.table(
    migrationHistory.map((h) => ({
      id: h.id,
      name: h.name,
      applied_by: h.applied_by,
      applied_at: h.applied_at,
    }))
  );
  console.log("Unapplied migrations:");
  console.table(
    migrationFiles.slice(migrationHistory.length).map((m) => ({
      filename: m.filename,
    }))
  );
};

export const printMigrationHistory = (migrationHistory: MigrationRow[]) => {
  console.log("Migration history:");
  console.table(
    migrationHistory.map((h) => ({
      id: h.id,
      name: h.name,
      applied_by: h.applied_by,
      applied_at: h.applied_at,
    }))
  );
};

export const fileExists = async (path: string) => {
  try {
    return (await fs.stat(path)).isFile();
  } catch (error) {
    return false;
  }
};

export const readDownMigrationFiles = async (
  directory: string,
  migrationHistory: MigrationRow[]
) => {
  const results: {
    type: "down";
    fullFilePath: string;
    filename: string;
    upFilename: string;

    script: string;
  }[] = [];
  for (const migration of migrationHistory) {
    const fullFilePath = path.join(
      directory,
      `${migration.name.split(".sql")[0]}.down.sql`
    );
    if (!(await fileExists(fullFilePath))) {
      console.error(`Down migration file not found: ${fullFilePath}`);
      process.exit(1);
    }
    const script = await fs.readFile(fullFilePath, "utf8");
    results.push({
      type: "down",
      fullFilePath,
      filename: path.basename(fullFilePath),
      upFilename: migration.name,
      script,
    });
  }
  return results;
};
