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
  --nundo                    Number of undo migrations to apply (default: 1)
  --filename                 The filename to get the script for (default: last applied migration)

Example:
  npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./test/migrations-template/
```

## Examples

[comment]: <> (Start of examples)

### Migrate

If all files are in a valid state, runs all the "up" migrations that have not been applied yet.

```bash
npx stepwise-migrations migrate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
Creating schema myschema... done!
Creating stepwise_migration_events table... done!
Applying versioned migration v1_first.sql... done!
Applying versioned migration v2_second.sql... done!
Applying versioned migration v3_third.sql... done!
Applying repeatable migration v0_get_number.repeatable.sql... done!
All done! Applied 4 migrations
All applied versioned migrations:
┌─────────┬────┬─────────────┬─────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type        │ filename        │ applied_by │ applied_at                   │
├─────────┼────┼─────────────┼─────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'versioned' │ 'v1_first.sql'  │ 'postgres' │ '2024-11-25 15:25:55.799253' │
│ 1       │ 2  │ 'versioned' │ 'v2_second.sql' │ 'postgres' │ '2024-11-25 15:25:55.80306'  │
│ 2       │ 3  │ 'versioned' │ 'v3_third.sql'  │ 'postgres' │ '2024-11-25 15:25:55.80534'  │
└─────────┴────┴─────────────┴─────────────────┴────────────┴──────────────────────────────┘
All applied repeatable migrations:
┌─────────┬────┬──────────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type         │ filename                       │ applied_by │ applied_at                   │
├─────────┼────┼──────────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 4  │ 'repeatable' │ 'v0_get_number.repeatable.sql' │ 'postgres' │ '2024-11-25 15:25:55.807375' │
└─────────┴────┴──────────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied versioned migrations:
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
```

</details>

### Undo

Runs a single undo migration for the last applied migration.
Can run multiple undo migrations if the `--nundo` option is provided.

Command:

```bash
npx stepwise-migrations undo \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
[
  {
    type: 'undo',
    filename: 'v3_third.undo.sql',
    script: 'drop table third;'
  }
]
Applying undo migration v3_third.undo.sql... done!
All done! Performed 1 undo migration
All applied versioned migrations:
┌─────────┬────┬─────────────┬─────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type        │ filename        │ applied_by │ applied_at                   │
├─────────┼────┼─────────────┼─────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'versioned' │ 'v1_first.sql'  │ 'postgres' │ '2024-11-25 15:25:55.799253' │
│ 1       │ 2  │ 'versioned' │ 'v2_second.sql' │ 'postgres' │ '2024-11-25 15:25:55.80306'  │
│ 2       │ 3  │ 'versioned' │ 'v3_third.sql'  │ 'postgres' │ '2024-11-25 15:25:55.80534'  │
└─────────┴────┴─────────────┴─────────────────┴────────────┴──────────────────────────────┘
All applied repeatable migrations:
┌─────────┬────┬──────────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type         │ filename                       │ applied_by │ applied_at                   │
├─────────┼────┼──────────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 4  │ 'repeatable' │ 'v0_get_number.repeatable.sql' │ 'postgres' │ '2024-11-25 15:25:55.807375' │
└─────────┴────┴──────────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied versioned migrations:
┌─────────┐
│ (index) │
├─────────┤
└─────────┘
```

</details>

### Validate

Validates the migration files and the stepwise_migration_events table.

```bash
npx stepwise-migrations validate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output - validation passed</summary>

```text
Validation passed
All applied versioned migrations:
┌─────────┬────┬─────────────┬─────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type        │ filename        │ applied_by │ applied_at                   │
├─────────┼────┼─────────────┼─────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'versioned' │ 'v1_first.sql'  │ 'postgres' │ '2024-11-25 15:25:55.799253' │
│ 1       │ 2  │ 'versioned' │ 'v2_second.sql' │ 'postgres' │ '2024-11-25 15:25:55.80306'  │
└─────────┴────┴─────────────┴─────────────────┴────────────┴──────────────────────────────┘
All applied repeatable migrations:
┌─────────┬────┬──────────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type         │ filename                       │ applied_by │ applied_at                   │
├─────────┼────┼──────────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 4  │ 'repeatable' │ 'v0_get_number.repeatable.sql' │ 'postgres' │ '2024-11-25 15:25:55.807375' │
└─────────┴────┴──────────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied versioned migrations:
┌─────────┬─────────────┬────────────────┐
│ (index) │ type        │ filename       │
├─────────┼─────────────┼────────────────┤
│ 0       │ 'versioned' │ 'v3_third.sql' │
└─────────┴─────────────┴────────────────┘
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
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
Event history:
┌─────────┬────┬──────────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type         │ filename                       │ applied_by │ applied_at                   │
├─────────┼────┼──────────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'versioned'  │ 'v1_first.sql'                 │ 'postgres' │ '2024-11-25 15:25:55.799253' │
│ 1       │ 2  │ 'versioned'  │ 'v2_second.sql'                │ 'postgres' │ '2024-11-25 15:25:55.80306'  │
│ 2       │ 3  │ 'versioned'  │ 'v3_third.sql'                 │ 'postgres' │ '2024-11-25 15:25:55.80534'  │
│ 3       │ 4  │ 'repeatable' │ 'v0_get_number.repeatable.sql' │ 'postgres' │ '2024-11-25 15:25:55.807375' │
│ 4       │ 5  │ 'undo'       │ 'v3_third.undo.sql'            │ 'postgres' │ '2024-11-25 15:25:56.588007' │
└─────────┴────┴──────────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
```

</details>

### Info

Shows the current state of the migrations in the database.

Command:

```bash
npx stepwise-migrations info \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
All applied versioned migrations:
┌─────────┬────┬─────────────┬─────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type        │ filename        │ applied_by │ applied_at                   │
├─────────┼────┼─────────────┼─────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'versioned' │ 'v1_first.sql'  │ 'postgres' │ '2024-11-25 15:25:55.799253' │
│ 1       │ 2  │ 'versioned' │ 'v2_second.sql' │ 'postgres' │ '2024-11-25 15:25:55.80306'  │
└─────────┴────┴─────────────┴─────────────────┴────────────┴──────────────────────────────┘
All applied repeatable migrations:
┌─────────┬────┬──────────────┬────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ type         │ filename                       │ applied_by │ applied_at                   │
├─────────┼────┼──────────────┼────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 4  │ 'repeatable' │ 'v0_get_number.repeatable.sql' │ 'postgres' │ '2024-11-25 15:25:55.807375' │
└─────────┴────┴──────────────┴────────────────────────────────┴────────────┴──────────────────────────────┘
Unapplied versioned migrations:
┌─────────┬─────────────┬────────────────┐
│ (index) │ type        │ filename       │
├─────────┼─────────────┼────────────────┤
│ 0       │ 'versioned' │ 'v3_third.sql' │
└─────────┴─────────────┴────────────────┘
```

</details>

### Get Applied Script

Gets the script for the last applied migration.
Can get the script for a specific migration if the `--filename` option is provided.

Command:

```bash
npx stepwise-migrations get-applied-script --filename v1_first.sql \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
create table first (
  id serial primary key,
  name text not null
);

```

</details>

### Drop

Drops the tables, schema and stepwise_migration_events table.

Command:

```bash
npx stepwise-migrations drop \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
Dropping the tables, schema and migration history table... done!
```

</details>

[comment]: <> (End of examples)
