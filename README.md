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
  info
    Show information about the current state of the migrations in the database
  drop
    Drop all tables, schema and migration history table

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations
  --path <path>              The path to the migrations directory
  --ssl true/false           Whether to use SSL for the connection (default: false)
  --nup                      Number of up migrations to apply (default: all)
  --ndown                    Number of down migrations to apply (default: 1)

Example:
  npx stepwise-migrations \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./db/migration/ \
    migrate
```

## Examples

### Migrate

Command:

```bash
npx stepwise-migrations migrate \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

Outputs:

```
Creating schema myschema... done!
Creating migration history table... done!
Applying migration v1_connect_session_table.sql... done!
Applying migration v2_auth.sql... done!
All done! Applied 2 migrations
New migration history:
┌─────────┬────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────┬────────────┬─────────────────────────────┐
│ (index) │ id │ name                           │ hash                                                               │ applied_by │ applied_at                  │
├─────────┼────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────┼────────────┼─────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'f08638e58139ae0e2dda24b1bdba29f3f2128597066a23d2bb382d448bbe9d7e' │ 'postgres' │ '2024-11-23 18:29:16.1616'  │
│ 1       │ 2  │ 'v2_auth.sql'                  │ '0a4c5df39f03df85cb68ef0b297b913d7c15477fa9dcba13b6e0577d88258a8e' │ 'postgres' │ '2024-11-23 18:29:16.16533' │
└─────────┴────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────┴────────────┴─────────────────────────────┘
```

### Down

Command:

```bash
npx stepwise-migrations down \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

Outputs:

```
Applying down migration v2_auth.down.sql... done!
All done! Applied 1 down migration
New migration history:
┌─────────┬────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────┬────────────┬────────────────────────────┐
│ (index) │ id │ name                           │ hash                                                               │ applied_by │ applied_at                 │
├─────────┼────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────┼────────────┼────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'f08638e58139ae0e2dda24b1bdba29f3f2128597066a23d2bb382d448bbe9d7e' │ 'postgres' │ '2024-11-23 18:29:16.1616' │
└─────────┴────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────┴────────────┴────────────────────────────┘
```

### Info

Command:

```bash
npx stepwise-migrations info \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

Outputs:

```
Migration history:
┌─────────┬────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────┬────────────┬────────────────────────────┐
│ (index) │ id │ name                           │ hash                                                               │ applied_by │ applied_at                 │
├─────────┼────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────┼────────────┼────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'f08638e58139ae0e2dda24b1bdba29f3f2128597066a23d2bb382d448bbe9d7e' │ 'postgres' │ '2024-11-23 18:29:16.1616' │
└─────────┴────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────┴────────────┴────────────────────────────┘
```

### Drop

Command:

```bash
npx stepwise-migrations drop \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema
```

Outputs:

```
Dropping the tables, schema and migration history table... done!
```
