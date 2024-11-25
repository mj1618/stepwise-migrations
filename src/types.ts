import { z } from "zod";

export type MigrationType = "versioned" | "undo" | "repeatable";

export interface MigrationFile {
  type: MigrationType;
  filename: string;
  script: string;
}

export interface AppliedMigration {
  id: number;
  type: MigrationType;
  filename: string;
  script: string;
  applied_by: string;
  applied_at: string;
}

export interface MigrationState {
  schema: string;
  current: {
    appliedVersionedMigrations: AppliedMigration[];
    appliedRepeatableMigrations: AppliedMigration[];
  };
  events: {
    id: number;
    type: MigrationType;
    filename: string;
    script: string;
    applied_by: string;
    applied_at: string;
  }[];
  files: {
    allFiles: MigrationFile[];
    unappliedVersionedFiles: MigrationFile[];
    unappliedRepeatableFiles: MigrationFile[];
    versionedFiles: MigrationFile[];
    undoFiles: MigrationFile[];
    repeatableFiles: MigrationFile[];
  };
  errors: string[];
}

const MigrationType = z.enum(["versioned", "undo", "repeatable"]);

export const EventRow = z.object({
  id: z.number(),
  type: MigrationType,
  filename: z.string(),
  script: z.string(),
  applied_by: z.string(),
  applied_at: z.string(),
});
