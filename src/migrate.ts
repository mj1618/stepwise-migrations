import { PoolClient } from "pg";
import { MigrationRow } from "./types";

export const validateMigrationFiles = (
  migrationFiles: { fullFilePath: string; filename: string; hash: string }[],
  migrationHistory: MigrationRow[]
) => {
  if (migrationFiles.length === 0) {
    console.log("No migrations found");
    process.exit(0);
  }

  if (migrationFiles.length < migrationHistory.length) {
    console.error(
      "Error: migration history is longer than the number of migration files, aborting."
    );
    process.exit(1);
  }

  if (migrationFiles.length === migrationHistory.length) {
    console.log("All migrations are already applied");
    process.exit(0);
  }

  for (let i = 0; i < migrationFiles.length; i++) {
    const { filename, hash: migrationHash } = migrationFiles[i];
    if (i >= migrationHistory.length) {
      continue;
    }
    if (migrationHistory[i].name !== filename) {
      console.error(`Error: migration ${filename} has been renamed, aborting.`);
      process.exit(1);
    }
    if (migrationHistory[i].hash !== migrationHash) {
      console.error(
        `Error: migration ${filename} has been modified, aborting.`
      );
      process.exit(1);
    }
  }
};

export const applyMigration = async (
  client: PoolClient,
  schema: string,
  filename: string,
  contents: string,
  hash: string
) => {
  try {
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO ${schema};
    ${contents.toString()}`
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_migrations (name, hash) VALUES ($1, $2)`,
      [filename, hash]
    );

    await client.query("COMMIT");

    console.log(`Applied migration ${filename}`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction", error);
    }
    console.error("Error applying migration", error);
    process.exit(1);
  }
};