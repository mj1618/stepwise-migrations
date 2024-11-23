# Stepwise Migrations

[![NPM](https://nodei.co/npm/stepwise-migrations.png)](https://npmjs.org/package/stepwise-migrations)

A tool for managing Raw SQL migrations in a Postgres database.
Loosely based on flyway.
Only "up" migrations are supported so far, but what more do you need?

## Notes

All files ending in `.sql` in the migration directory will be applied.
They are first sorted in ascending order based on filename.
No subdirectories are read below the migration directory.

## Usage

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
