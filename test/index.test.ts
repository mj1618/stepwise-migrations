import fs from "node:fs";
import { beforeEach, describe, it } from "node:test";
import { assertIncludesAll, assertIncludesExcludesAll, execute } from "./utils";
const connection = "postgresql://postgres:postgres@127.0.0.1:5432/mydb";
const schema = "testschema";

const paths = {
  valid: "./test/migrations-valid",
  invalid: "./test/migrations-invalid",
};

const executeCommand = (
  command: string,
  path: string = "",
  extraArgs: string = ""
) =>
  execute(`npm exec stepwise-migrations ${command} -- \\
    --connection=${connection} \\
    --schema=${schema} \\
    --path=${path} ${extraArgs}
  `);

describe("valid migrations", async () => {
  beforeEach(async () => {
    assertIncludesAll(await executeCommand("drop", ""), [
      "Dropping the tables, schema and migration history table... done!",
    ]);

    fs.rmSync(paths.valid, { recursive: true, force: true });
    fs.cpSync("./test/migrations-template", paths.valid, {
      recursive: true,
    });
  });

  it("migrate without params", async () => {
    assertIncludesAll(await execute("npm exec stepwise-migrations"), [
      "stepwise-migrations <command>",
    ]);
  });

  it("baseline", async () => {
    assertIncludesAll(await executeCommand("baseline", paths.valid), [
      "All done! (Shadow)-applied 3 migrations to baseline to v3_third.sql",
    ]);
    assertIncludesExcludesAll(
      await executeCommand("status"),
      ["v1_first.sql", "v2_second.sql", "v3_third.sql"],
      ["v0_get_number.repeatable.sql"]
    );
  });

  it("migrate one versioned and undo, redo, undo", async () => {
    assertIncludesAll(await executeCommand("migrate", paths.valid), [
      "All done! Applied 4 migrations",
    ]);
    assertIncludesAll(await executeCommand("status"), [
      "v0_get_number.repeatable.sql",
      "v1_first.sql",
      "v2_second.sql",
      "v3_third.sql",
    ]);

    assertIncludesAll(await executeCommand("undo", paths.valid), [
      "All done! Performed 1 undo migration",
    ]);
    assertIncludesExcludesAll(
      await executeCommand("status"),
      ["v0_get_number.repeatable.sql", "v1_first.sql", "v2_second.sql"],
      ["v3_third.sql"]
    );

    assertIncludesAll(await executeCommand("migrate", paths.valid), [
      "All done! Applied 1 migration",
    ]);
    assertIncludesAll(await executeCommand("status"), [
      "v0_get_number.repeatable.sql",
      "v1_first.sql",
      "v2_second.sql",
      "v3_third.sql",
    ]);

    assertIncludesAll(await executeCommand("undo", paths.valid, "--nundo=2"), [
      "All done! Performed 2 undo migrations",
    ]);
    assertIncludesExcludesAll(
      await executeCommand("status"),
      ["v0_get_number.repeatable.sql", "v1_first.sql"],
      ["v2_second.sql", "v3_third.sql"]
    );

    assertIncludesAll(await executeCommand("migrate", paths.valid), [
      "All done! Applied 2 migrations",
    ]);
    assertIncludesAll(await executeCommand("status"), [
      "v0_get_number.repeatable.sql",
      "v1_first.sql",
      "v2_second.sql",
      "v3_third.sql",
    ]);
  });

  it("migrate with altered repeatable migration", async () => {
    assertIncludesAll(await executeCommand("migrate", paths.valid), [
      "All done! Applied 4 migrations",
    ]);
    assertIncludesAll(await executeCommand("status"), [
      "v0_get_number.repeatable.sql",
      "v1_first.sql",
      "v2_second.sql",
      "v3_third.sql",
    ]);

    fs.writeFileSync(
      "./test/migrations-valid/v0_get_number.repeatable.sql",
      `
      CREATE OR REPLACE FUNCTION get_number()
      RETURNS integer AS $$
      BEGIN
          RETURN 2;
      END; $$
      LANGUAGE plpgsql;
      `
    );

    assertIncludesAll(await executeCommand("migrate", paths.valid), [
      "All done! Applied 1 migration",
    ]);
  });
});

describe.only("invalid migrations", async () => {
  beforeEach(async () => {
    assertIncludesAll(await executeCommand("drop", ""), [
      "Dropping the tables, schema and migration history table... done!",
    ]);

    fs.rmSync(paths.invalid, { recursive: true, force: true });
    fs.cpSync("./test/migrations-template", paths.invalid, {
      recursive: true,
    });
  });

  it.only("missing undo migration", async () => {
    assertIncludesAll(await executeCommand("migrate", paths.invalid), [
      "All done!",
    ]);

    fs.unlinkSync("./test/migrations-invalid/v3_third.undo.sql");

    assertIncludesAll(
      await executeCommand("undo", paths.invalid, "--nundo=2"),
      ["Error: not enough sequential (from last) undo migrations to apply"]
    );
  });

  it("alter migration", async () => {
    assertIncludesAll(await executeCommand("migrate", paths.invalid), [
      "All done!",
    ]);

    fs.writeFileSync(
      "./test/migrations-invalid/v1_first.sql",
      "ALTER TABLE test ADD COLUMN test_column TEXT;"
    );

    assertIncludesAll(await executeCommand("migrate", paths.invalid), [
      "Versioned migration v1_first.sql has been altered. Cannot migrate in current state.",
    ]);
  });

  it("bad creds", async () => {
    assertIncludesAll(
      await execute(`npm exec stepwise-migrations info -- \\
      --connection=postgresql://postgres:badpassword@127.0.0.1:5432/mydb \\
      --schema=${schema} \\
      --path=${paths.invalid}
    `),
      ["password authentication failed for user"]
    );
  });
});
