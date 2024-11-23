import pg, { Pool, PoolClient } from "pg";
import { MigrationRow } from "./types";

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
    console.log("Connected to the database");
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }

  return client;
};

export const dbHistorySchemaExists = async (
  client: PoolClient,
  schema: string
) => {
  const result = await client.query(
    `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '${schema}')`
  );
  return result.rows[0].exists;
};

export const dbTableExists = async (client: PoolClient, schema: string) => {
  const tableExistsResult = await client.query(
    `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stepwise_migrations' and schemaname = '${schema}')`
  );

  return tableExistsResult.rows[0].exists;
};

export const dbMigrationHistory = async (
  client: PoolClient,
  schema: string
) => {
  const migrationsQuery = await client.query(
    `SELECT * FROM ${schema}.stepwise_migrations`
  );
  return migrationsQuery.rows as MigrationRow[];
};

export const dbCreateSchema = async (client: PoolClient, schema: string) => {
  console.log(`Creating schema ${schema}`);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  console.log(`Schema ${schema} created`);
};

export const dbCreateHistoryTable = async (
  client: PoolClient,
  schema: string
) => {
  console.log(`Creating migration history table`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${schema}.stepwise_migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL,
    applied_by TEXT NOT NULL DEFAULT current_user,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  console.log(`Migration history table created`);
};
