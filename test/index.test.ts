import assert from "node:assert";
import fs from "node:fs";
import { beforeEach, describe, it } from "node:test";
import { assertIncludesAll, assertIncludesExcludesAll, execute } from "./utils";
const connection = "postgresql://postgres:postgres@127.0.0.1:5432/stepwise-db";
const schema = "stepwise";

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

describe.only("valid migrations", async () => {
  beforeEach(async () => {
    const { output, error, exitCode } = await executeCommand("drop", "");
    assert.ok(
      output.includes(
        "Dropping the tables, schema and migration history table... done!"
      )
    );
    assert.ok(exitCode === 0);

    fs.rmSync(paths.valid, { recursive: true, force: true });
    fs.cpSync("./test/migrations-template", paths.valid, {
      recursive: true,
    });
  });

  it("migrate without params", async () => {
    assertIncludesAll(await execute("npm exec stepwise-migrations"), ["Usage"]);
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

  it.only("migrate with altered repeatable migration", async () => {
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

describe("invalid migrations", async () => {
  beforeEach(async () => {
    const { output, error, exitCode } = await executeCommand("drop", "");
    assert.ok(
      output.includes(
        "Dropping the tables, schema and migration history table... done!"
      )
    );
    assert.ok(exitCode === 0);

    fs.rmSync(paths.invalid, { recursive: true, force: true });
    fs.cpSync("./test/migrations-template", paths.invalid, {
      recursive: true,
    });
  });

  it("missing down migration", async () => {
    assertIncludesAll(await executeCommand("migrate", paths.invalid), [
      "All done!",
    ]);

    fs.unlinkSync("./test/migrations-invalid/v3_third.undo.sql");

    assertIncludesAll(
      await executeCommand("undo", paths.invalid, "--nundos=2"),
      ["Missing undo migration for"]
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
});
