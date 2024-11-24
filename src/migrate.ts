import gitDiff from "git-diff";
import { PoolClient } from "pg";
import { MigrationRow } from "./types";

export const validateMigrationFiles = (
  migrationFiles: { fullFilePath: string; filename: string; script: string }[],
  migrationHistory: MigrationRow[],
  isUp: boolean = true
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

  for (let i = 0; i < migrationFiles.length; i++) {
    const { filename, script: migrationScript } = migrationFiles[i];
    if (i >= migrationHistory.length) {
      continue;
    }
    if (migrationHistory[i].name !== filename) {
      console.error(`Error: migration ${filename} has been renamed, aborting.`);
      process.exit(1);
    }
    if (migrationHistory[i].script !== migrationScript) {
      console.error(
        `Error: migration ${filename} has been modified, aborting.`
      );

      console.log(
        gitDiff(migrationHistory[i].script, migrationScript, {
          color: true,
          noHeaders: true,
        })
      );

      process.exit(1);
    }
  }
};

export const applyMigration = async (
  client: PoolClient,
  schema: string,
  filename: string,
  script: string
) => {
  try {
    process.stdout.write(`Applying migration ${filename}... `);
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO ${schema};
    ${script.toString()}`
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_migrations (name, script) VALUES ($1, $2)`,
      [filename, script]
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_audit (type, name, script) VALUES ($1, $2, $3)`,
      ["up", filename, script]
    );

    await client.query("COMMIT");

    console.log(`done!`);
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

export const validateDownMigrationFiles = (
  downMigrationFilesToApply: { filename: string }[],
  reverseMigrationHistory: MigrationRow[]
) => {
  for (let i = 0; i < downMigrationFilesToApply.length; i++) {
    const { filename } = downMigrationFilesToApply[i];
    if (
      filename.split(".down.sql")[0] !==
      reverseMigrationHistory[i].name.split(".sql")[0]
    ) {
      console.error(
        `Migration ${filename} does not match the expected migration ${reverseMigrationHistory[i].name}`
      );
      process.exit(1);
    }
  }
};

export const applyDownMigration = async (
  client: PoolClient,
  schema: string,
  filename: string,
  script: string,
  upFilename: string
) => {
  try {
    process.stdout.write(`Applying down migration ${filename}... `);
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO ${schema};
    ${script.toString()}`
    );

    await client.query(
      `DELETE FROM ${schema}.stepwise_migrations WHERE name = $1`,
      [upFilename]
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_audit (type, name, script) VALUES ($1, $2, $3)`,
      ["down", filename, script]
    );

    await client.query("COMMIT");

    console.log(`done!`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction", error);
    }
    console.error("Error applying down migration", error);
    process.exit(1);
  }
};
