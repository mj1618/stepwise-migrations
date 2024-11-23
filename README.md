# Stepwise Migrations

[![npm version](https://badge.fury.io/js/stepwise-migrations.svg?icon=si%3Anpm)](https://badge.fury.io/js/stepwise-migrations)

A tool for managing Raw SQL migrations in a Postgres database.
Loosely based on flyway.

## Notes

Name up migration files as `.sql` and down migration files with the same name but suffixed with `.down.sql`.
e.g. `v1_users.sql` and `v1_users.down.sql`.
Down migrations are optional.

They are first sorted in ascending order based on filename.
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
Connected to the database
Creating schema collie
Schema collie created
Creating migration history table
Migration history table created
Found 2 migration files
Applied migration V0_01__connect_session_table.sql
Applied migration V0_02__auth.sql
All done!
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

Connected to the database
Applied down migration v2_auth.down.sql
All done!
New migration history:
┌─────────┬────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                           │ hash                                                               │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'v1_connect_session_table.sql' │ 'f08638e58139ae0e2dda24b1bdba29f3f2128597066a23d2bb382d448bbe9d7e' │ 'postgres' │ '2024-11-23 18:13:36.518495' │
└─────────┴────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────┴────────────┴──────────────────────────────┘
```

### Info

```bash
npx stepwise-migrations info \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema \
  --path=./db/migration/
```

Outputs:

```
Connected to the database
Showing information about the current state of the migrations in the database
Migration history schema exists
Migration history table exists
Migration history:
┌─────────┬────┬────────────────────────────────────┬────────────────────────────────────────────────────────────────────┬────────────┬──────────────────────────────┐
│ (index) │ id │ name                               │ hash                                                               │ applied_by │ applied_at                   │
├─────────┼────┼────────────────────────────────────┼────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────┤
│ 0       │ 1  │ 'V0_01__connect_session_table.sql' │ 'f08638e58139ae0e2dda24b1bdba29f3f2128597066a23d2bb382d448bbe9d7e' │ 'postgres' │ '2024-11-23 16:24:50.437496' │
│ 1       │ 2  │ 'V0_02__auth.sql'                  │ '0a4c5df39f03df85cb68ef0b297b913d7c15477fa9dcba13b6e0577d88258a8e' │ 'postgres' │ '2024-11-23 16:24:50.440493' │
└─────────┴────┴────────────────────────────────────┴────────────────────────────────────────────────────────────────────┴────────────┴──────────────────────────────┘
```

### Drop

```bash
npx stepwise-migrations drop \
  --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
  --schema=myschema
```

Outputs:

```
Connected to the database
Dropping the tables, schema and migration history table
All done!
```
