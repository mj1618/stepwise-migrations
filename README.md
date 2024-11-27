# Stepwise Migrations

A JavaScript CLI tool for managing Raw SQL migrations in a Postgres database.
Loosely based on flyway.

![NPM Version](https://img.shields.io/npm/v/stepwise-migrations)
![Test Workflow](https://github.com/github/docs/actions/workflows/test.yml/badge.svg)

## Table of Contents

- [Stepwise Migrations](#stepwise-migrations)
  - [Installation](#installation)
  - [Instructions](#instructions)
  - [Usage](#usage)
  - [Examples](#examples)
    - [Migrate](#migrate)
    - [Undo](#undo)
    - [Validate](#validate)
    - [Audit](#audit)
    - [Info](#info)
    - [Get Applied Script](#get-applied-script)
    - [Drop](#drop)

## Installation

Once your Postgres DB is running, simply use `npx` to get started:

```bash
mkdir ./your-migrations-directory
echo "create table first (id serial primary key, name text not null);" > ./your-migrations-directory/v1_first.sql

npx stepwise-migrations migrate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
  --schema=myschema \
  --path=./your-migrations-directory/
```

## Instructions

There are three types of migrations:

<b>1. Versioned migrations</b>

- The filename must end with `.sql`.
- These are always applied in ascending order based on filename.
- Once applied, the file cannot be altered or else an error will be thrown.

<b>2. Repeatable migrations</b>

- Are identified by the filename ending with `.repeatable.sql`
- For things like trigger functions
- Are always applied after all versioned migrations
- When altered, the new script is applied on next migration run

<b>3. Undo migrations</b>

- Are completely optional
- Must have the same filename as the versioned migration but suffixed with `.undo.sql`
- Are applied in reverse order of the versioned migrations
- Can only be for undoing versioned migrations, not repeatable migrations. For repeatable migrations, simply delete the trigger function in the repeatable migration file and migrate again.

## Usage

```text
Usage: stepwise-migrations <command> [options]

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
  --ssl true/false           Whether to use SSL for the connection (default: false)
  --napply                   Number of up migrations to apply (default: all)
  --nundo                    Number of undo migrations to apply (default: 1)
  --filename                 (get-applied-script) The filename to get the script for (default: last applied migration)
  --filename                 (baseline) The filename to baseline (default: last unapplied versioned migration)

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

```
There were errors loading the migration state. Please fix the errors and try again.
  - Versioned migration v1_first.sql has been altered. Cannot migrate in current state.

@@ -2,3 +2,5 @@ create table first (
   id serial primary key,
   name text not null
 );
+
+ALTER TABLE first ADD COLUMN age int;
\ No newline at end of file
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

### Baseline

Without applying any migrations, set the migration table state to a specific version.

Command:

```bash
npx stepwise-migrations baseline \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./test/migrations-template/
```

<details>

<summary>Example output</summary>

```text
Creating schema myschema... done!
Creating stepwise_migration_events table... done!
Baselining v1_first.sql... done!
Baselining v2_second.sql... done!
Baselining v3_third.sql... done!
All done! (Shadow)-applied 3 migrations to baseline to v3_third.sql
```

</details>

[comment]: <> (End of examples)
