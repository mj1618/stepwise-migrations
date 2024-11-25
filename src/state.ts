import gitDiff from "git-diff";
import path from "path";
import { PoolClient } from "pg";
import { dbEventHistory } from "./db";
import { AppliedMigration, MigrationState } from "./types";
import { readMigrationFiles } from "./utils";

export const validateMigrationFiles = (state: MigrationState) => {
  let errors: string[] = [];

  if (state.files.allFiles.length === 0) {
    return ["No migration files found"];
  }

  if (
    state.current.appliedVersionedMigrations.length >
    state.files.versionedFiles.length
  ) {
    errors.push(
      "Migration history is in a bad state: more applied versioned migrations than files"
    );
  }

  for (let i = 0; i < state.current.appliedVersionedMigrations.length; i++) {
    const { filename, script } = state.files.versionedFiles[i];
    if (state.current.appliedVersionedMigrations[i].filename !== filename) {
      errors.push(
        `Migration history is in a bad state: applied versioned migration ${state.current.appliedVersionedMigrations[i].filename} does not match file ${filename}`
      );
      break;
    }
    if (state.current.appliedVersionedMigrations[i].script !== script) {
      errors.push(
        `Migration history is in a bad state: applied versioned migration ${state.current.appliedVersionedMigrations[i].filename} has been modified.\n\n` +
          gitDiff(state.current.appliedVersionedMigrations[i].script, script, {
            color: true,
            noHeaders: true,
          })
      );
      break;
    }
  }

  if (
    state.current.appliedRepeatableMigrations.length >
    state.files.repeatableFiles.length
  ) {
    errors.push(
      "Migration history is in a bad state: more applied repeatable migrations than files"
    );
  }

  for (let i = 0; i < state.current.appliedRepeatableMigrations.length; i++) {
    const { filename } = state.files.repeatableFiles[i];
    if (state.current.appliedRepeatableMigrations[i].filename !== filename) {
      errors.push(
        `Migration history is in a bad state: applied repeatable migration ${state.current.appliedRepeatableMigrations[i].filename} does not match file ${filename}`
      );
      break;
    }
  }

  return errors;
};

export const loadState = async (
  client: PoolClient,
  schema: string,
  migrationPath: string
): Promise<MigrationState> => {
  const events = await dbEventHistory(client, schema);
  const {
    appliedVersionedMigrations,
    appliedRepeatableMigrations,
    errors: appliedErrors,
  } = eventsToApplied(events);
  const { files: allFiles, errors: readFileErrors } = await readMigrationFiles(
    path.join(process.cwd(), migrationPath),
    appliedVersionedMigrations
  );
  const unappliedVersionedFiles = allFiles
    .filter((file) => file.type === "versioned")
    .filter(
      (file) =>
        !appliedVersionedMigrations.find(
          (event) => event.filename === file.filename
        )
    );
  const unappliedRepeatableFiles = allFiles
    .filter((file) => file.type === "repeatable")
    .filter(
      (file) =>
        !appliedRepeatableMigrations.find(
          (event) =>
            event.filename === file.filename && event.script === file.script
        )
    );

  return {
    schema,
    current: {
      appliedVersionedMigrations,
      appliedRepeatableMigrations,
    },
    events,
    files: {
      allFiles,
      unappliedVersionedFiles,
      unappliedRepeatableFiles,
      versionedFiles: allFiles.filter((file) => file.type === "versioned"),
      undoFiles: allFiles.filter((file) => file.type === "undo"),
      repeatableFiles: allFiles.filter((file) => file.type === "repeatable"),
    },
    errors: appliedErrors.concat(readFileErrors),
  };
};

export const getUndoFilename = (filename: string) => {
  return filename.replace(".sql", ".undo.sql");
};

export const eventsToApplied = (
  events: MigrationState["events"]
): {
  errors: string[];
  appliedVersionedMigrations: AppliedMigration[];
  appliedRepeatableMigrations: AppliedMigration[];
} => {
  let errors: string[] = [];
  let appliedVersionedMigrations: AppliedMigration[] = [];
  let appliedRepeatableMigrations: AppliedMigration[] = [];

  for (const event of events) {
    if (event.type === "versioned") {
      appliedVersionedMigrations.push(event);
    } else if (event.type === "undo") {
      if (appliedVersionedMigrations.length === 0) {
        errors.push(
          "Events table is in a bad state: undo event without a migration to undo"
        );
        break;
      } else if (
        getUndoFilename(
          appliedVersionedMigrations[appliedVersionedMigrations.length - 1]
            .filename
        ) !== event.filename
      ) {
        errors.push(
          "Events table is in a bad state: down migration does not match the most recently applied migration"
        );
        break;
      } else {
        appliedVersionedMigrations.pop();
      }
    } else if (event.type === "repeatable") {
      appliedRepeatableMigrations.push(event);
    } else {
      errors.push(
        `Events table is in a bad state: unknown event type ${event.type}`
      );
      break;
    }
  }

  return { errors, appliedVersionedMigrations, appliedRepeatableMigrations };
};
