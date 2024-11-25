# Stepwise Migrations

[![npm version](https://badge.fury.io/js/stepwise-migrations.svg?icon=si%3Anpm&)](https://badge.fury.io/js/stepwise-migrations)

A tool for managing Raw SQL migrations in a Postgres database.
Loosely based on flyway.

## Instructions

Up migrations are first sorted in ascending order based on filename.
No subdirectories are read below the migration directory.

Name the "up" migration files as `.sql` and the "down" migration files with the same name but suffixed with `.undo.sql`.
e.g. `v1_users.sql` and `v1_users.undo.sql`.
Down migrations are optional.

## Usage

```text
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

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations
  --path <path>              The path to the migrations directory
  --ssl true/false           Whether to use SSL for the connection (default: false)
  --napply                      Number of up migrations to apply (default: all)
  --nundo                    Number of down migrations to apply (default: 1)
  --filename                 The filename to get the script for (default: last applied migration)

Example:
  npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./db/migration/
```

## Examples

[comment]: <> (Start of examples)

### Migrate

If all files are in a valid state, runs all the "up" migrations that have not been applied yet.

```bash
npx stepwise-migrations migrate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output</summary>

```text
Creating schema myschema... done!
Creating stepwise_migration_events table... done!
Applying migration v1_connect_session_table.sql... done!
Applying migration v2_auth.sql... done!
All done! Applied 2 migrations
Migration state:
┌─────────┬────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                           │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'postgres' │ '2024-11-24 05:40:41.211617' │
│ 1       │ 2  │ 'v2_auth.sql'                  │ 'postgres' │ '2024-11-24 05:40:41.214732' │
└─────────┴────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied migrations:
┌─────────┐
│ (index) │
├─────────┤
```

</details>

### Undo

Runs a single down migration for the last applied migration.
Can run multiple down migrations if the `--nundo` option is provided.

Command:

```bash
npx stepwise-migrations down \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output</summary>

```text
Applying down migration v2_auth.undo.sql... done!
All done! Applied 1 down migration
Migration state:
┌─────────┬────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                           │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'postgres' │ '2024-11-24 05:40:41.211617' │
└─────────┴────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied migrations:
┌─────────┬───────────────┐
│ (index) │ filename      │
├─────────┼───────────────┤
│ 0       │ 'v2_auth.sql' │
└─────────┴───────────────┘
```

</details>

### Validate

Validates the migration files and the stepwise_migration_events table.

```bash
npx stepwise-migrations validate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output - validation passed</summary>

```text
Validation passed
Migration state:
┌─────────┬────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                           │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'postgres' │ '2024-11-24 05:40:41.211617' │
└─────────┴────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied migrations:
┌─────────┬───────────────┐
│ (index) │ filename      │
├─────────┼───────────────┤
│ 0       │ 'v2_auth.sql' │
└─────────┴───────────────┘
```

</details>

<details>

<summary>Example output - script changed error</summary>

```sql
Error: migration v1_connect_session_table.sql has been modified, aborting.
 	"expire" timestamp(6) NOT NULL
 )
 WITH (OIDS=FALSE);
-ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
\ No newline at end of file
+ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
+
+ALTER TABLE "session" ADD INDEX "session_sid" ON "session" (sid);
```

</details>

### Audit

Shows the audit history for the migrations in the database.

```bash
npx stepwise-migrations audit \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output</summary>

```text
Audit history:
┌─────────┬────┬────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type   │ name                           │ applied_by │ applied_at                   │
├─────────┼────┼────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'up'   │ 'v1_connect_session_table.sql' │ 'postgres' │ '2024-11-24 05:40:41.211617' │
│ 1       │ 2  │ 'up'   │ 'v2_auth.sql'                  │ 'postgres' │ '2024-11-24 05:40:41.214732' │
│ 2       │ 3  │ 'down' │ 'v2_auth.undo.sql'             │ 'postgres' │ '2024-11-24 05:41:34.541462' │
└─────────┴────┴────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
```

</details>

### Info

Shows the current state of the migrations in the database.

Command:

```bash
npx stepwise-migrations info \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output</summary>

```text
Migration state:
┌─────────┬────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                           │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'postgres' │ '2024-11-24 05:40:41.211617' │
└─────────┴────┴────────────────────────────────┴────────────┴──────────────────────────────┘
```

</details>

### Get Applied Script

Gets the script for the last applied migration.
Can get the script for a specific migration if the `--filename` option is provided.

Command:

```bash
npx stepwise-migrations get-applied-script --filename v2_auth.sql \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

<details>

<summary>Example output</summary>

```sql
CREATE TABLE "users" (
	id bigserial primary key,
	email text unique not null,
	first_name text not null,
	last_name text not null,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

</details>

### Drop

Drops the tables, schema and stepwise_migration_events table.

Command:

```bash
npx stepwise-migrations drop \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema
```

<details>

<summary>Example output</summary>

```text
Dropping the tables, schema and migration stepwise_migration_events table... done!
```

</details>

[comment]: <> (End of examples)
