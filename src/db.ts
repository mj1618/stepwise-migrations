import pg, { Pool, PoolClient } from "pg";
import { AuditRow, MigrationRow } from "./types";

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
  process.stdout.write(`Creating schema ${schema}... `);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  console.log(`done!`);
};

export const dbAuditHistory = async (client: PoolClient, schema: string) => {
  const auditQuery = await client.query(
    `SELECT * FROM ${schema}.stepwise_audit`
  );
  return auditQuery.rows as AuditRow[];
};

export const dbCreateHistoryTable = async (
  client: PoolClient,
  schema: string
) => {
  process.stdout.write(`Creating migration history table... `);
  await client.query(
    `
CREATE TABLE IF NOT EXISTS ${schema}.stepwise_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  script TEXT NOT NULL,
  applied_by TEXT NOT NULL DEFAULT current_user,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ${schema}.stepwise_audit (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  script TEXT NOT NULL,
  applied_by TEXT NOT NULL DEFAULT current_user,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
    `
  );
  console.log(`done!`);
};

export const dbGetScript = async (
  client: PoolClient,
  schema: string,
  filename: string
) => {
  const script = await client.query(
    `SELECT script FROM ${schema}.stepwise_audit WHERE name = $1`,
    [filename]
  );
  return script.rows[0].script;
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
