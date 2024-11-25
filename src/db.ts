import pg, { Pool, PoolClient } from "pg";
import { EventRow, MigrationFile, MigrationState } from "./types";

pg.types.setTypeParser(1114, function (stringValue) {
  return stringValue; //1114 for time without timezone type
});

pg.types.setTypeParser(1082, function (stringValue) {
  return stringValue; //1082 for date type
});

export const dbConnect = async (argv: { connection: string; ssl?: string }) => {
  const pool = new Pool({
    connectionString: argv.connection,
    ssl: argv.ssl === "true",
  });

  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }

  return client;
};

export const dbSchemaExists = async (client: PoolClient, schema: string) => {
  const result = await client.query(
    `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '${schema}')`
  );
  return result.rows[0].exists;
};

export const dbTableExists = async (client: PoolClient, schema: string) => {
  const tableExistsResult = await client.query(
    `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stepwise_migration_events' and schemaname = '${schema}')`
  );

  return tableExistsResult.rows[0].exists;
};

export const dbDropAll = async (client: PoolClient, schema: string) => {
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
};

export const dbCreateSchema = async (client: PoolClient, schema: string) => {
  process.stdout.write(`Creating schema ${schema}... `);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  console.log(`done!`);
};

export const dbEventHistory = async (client: PoolClient, schema: string) => {
  try {
    const eventQuery = await client.query(
      `SELECT * FROM ${schema}.stepwise_migration_events`
    );
    return eventQuery.rows.map((row) => EventRow.parse(row));
  } catch (error) {
    console.error("Error fetching event history", error);
    process.exit(1);
  }
};

export const dbCreateEventsTable = async (
  client: PoolClient,
  schema: string
) => {
  process.stdout.write(`Creating stepwise_migration_events table... `);
  await client.query(
    `
CREATE TABLE IF NOT EXISTS ${schema}.stepwise_migration_events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  script TEXT NOT NULL,
  applied_by TEXT NOT NULL DEFAULT current_user,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
    `
  );
  console.log(`done!`);
};

export const dbGetAppliedScript = async (
  state: MigrationState,
  filename: string
) => {
  return state.current.appliedVersionedMigrations
    .concat(state.current.appliedRepeatableMigrations)
    .find((file) => file.filename === filename)?.script;
};

export const applyMigration = async (
  client: PoolClient,
  schema: string,
  migration: MigrationFile
) => {
  try {
    process.stdout.write(
      `Applying ${migration.type} migration ${migration.filename}... `
    );
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO ${schema};
    ${migration.script.toString()}`
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_migration_events (type, filename, script) VALUES ($1, $2, $3)`,
      [migration.type, migration.filename, migration.script]
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

export const applyUndoMigration = async (
  client: PoolClient,
  schema: string,
  filename: string,
  script: string
) => {
  try {
    process.stdout.write(`Applying undo migration ${filename}... `);
    await client.query("BEGIN");

    await client.query(
      `SET search_path TO ${schema};
    ${script.toString()}`
    );

    await client.query(
      `INSERT INTO ${schema}.stepwise_migration_events (type, filename, script) VALUES ($1, $2, $3)`,
      ["undo", filename, script]
    );

    await client.query("COMMIT");

    console.log(`done!`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (error) {
      console.error("Error rolling back transaction", error);
    }
    console.error("Error applying undo migration", error);
    process.exit(1);
  }
};
