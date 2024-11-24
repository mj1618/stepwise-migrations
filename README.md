# Stepwise Migrations

[![npm version](https://badge.fury.io/js/stepwise-migrations.svg?icon=si%3Anpm)](https://badge.fury.io/js/stepwise-migrations)

A tool for managing Raw SQL migrations in a Postgres database.
Loosely based on flyway.

## Instructions

Name up migration files as `.sql` and down migration files with the same name but suffixed with `.down.sql`.
e.g. `v1_users.sql` and `v1_users.down.sql`.
NOTE: Down migrations are optional.

Up migrations are first sorted in ascending order based on filename.
No subdirectories are read below the migration directory.

## Usage

```
Usage: stepwise-migrations [command] [options]

Commands:
  migrate
    Migrate the database to the latest version
  down
    Rollback the database to the previous version
  validate
    Validate the migration files and the migration history table
  audit
    Show the audit history for the migrations in the database
  info
    Show information about the current state of the migrations in the database
  drop
    Drop all tables, schema and migration history table
  get-script
    Get the script for the last applied migration

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations
  --path <path>              The path to the migrations directory
  --ssl true/false           Whether to use SSL for the connection (default: false)
  --nup                      Number of up migrations to apply (default: all)
  --ndown                    Number of down migrations to apply (default: 1)
  --filename                 The filename to get the script for (default: last applied migration)

Example:
  npx stepwise-migrations migrate \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./db/migration/
```

## Examples

### Migrate

If all files are in a valid state, runs all the "up" migrations that have not been applied yet.

```bash
npx stepwise-migrations migrate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

### Down

Runs a single down migration for the last applied migration.
Can run multiple down migrations if the `--ndown` option is provided.

Command:

```bash
npx stepwise-migrations down \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

### Validate

Validates the migration files and the migration history table.

```bash
npx stepwise-migrations validate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

### Audit

Shows the audit history for the migrations in the database.

```bash
npx stepwise-migrations audit \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

### Info

Shows the current state of the migrations in the database.

Command:

```bash
npx stepwise-migrations info \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

### Drop

Drops the tables, schema and migration history table.

Command:

```bash
npx stepwise-migrations drop \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema
```

### Get Script

Gets the script for the last applied migration.
Can get the script for a specific migration if the `--filename` option is provided.

Command:

```bash
npx stepwise-migrations get-script \
  --filename v1_users.sql \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema
```
