export interface MigrationRow {
  id: string;
  name: string;
  script: string;
  applied_by: string;
  applied_at: string;
}

export type AuditRow = MigrationRow & { type: "up" | "down" };
