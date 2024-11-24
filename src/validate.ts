import gitDiff from "git-diff";
import { MigrationRow } from "./types";

export const validateMigrationFiles = (
  migrationFiles: { fullFilePath: string; filename: string; script: string }[],
  migrationHistory: MigrationRow[]
) => {
  if (migrationFiles.length === 0) {
    console.log("No migrations found");
    process.exit(0);
  }

  if (migrationFiles.length < migrationHistory.length) {
    console.error(
      "Error: migration history is longer than the number of migration files, aborting."
    );
    process.exit(1);
  }

  for (let i = 0; i < migrationFiles.length; i++) {
    const { filename, script: migrationScript } = migrationFiles[i];
    if (i >= migrationHistory.length) {
      continue;
    }
    if (migrationHistory[i].name !== filename) {
      console.error(`Error: migration ${filename} has been renamed, aborting.`);
      process.exit(1);
    }
    if (migrationHistory[i].script !== migrationScript) {
      console.error(
        `Error: migration ${filename} has been modified, aborting.`
      );

      console.log(
        gitDiff(migrationHistory[i].script, migrationScript, {
          color: true,
          noHeaders: true,
        })
      );

      process.exit(1);
    }
  }
};
