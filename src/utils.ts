import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const hashFile = async (path: string) => {
  const file = await fs.readFile(path);
  return crypto.createHash("sha256").update(file).digest("hex");
};

export const usage = `
Usage: stepwise-migrations [command] [options]

Commands:
  migrate
    Migrate the database to the latest version
  info
    Show information about the current state of the migrations in the database
  drop
    Drop the tables, schema and migration history table

Options:
  --connection <connection>  The connection string to use to connect to the database
  --schema <schema>          The schema to use for the migrations
  --path <path>              The path to the migrations directory
  --ssl true/false           Whether to use SSL for the connection (default: false)

Example:
  npx stepwise-migrations \
    --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydatabase \
    --schema=myschema \
    --path=./db/migration/ \
    migrate
`;

export const validateArgs = (argv: any) => {
  const required = ["connection", "schema", "path", "_"];
  if (required.some((key) => !(key in argv))) {
    console.error(
      "Missing required arguments",
      required.filter((key) => !(key in argv))
    );
    console.log(usage);
    process.exit(1);
  }
  if (argv._.length !== 1) {
    console.error(`Invalid number of arguments: ${argv._.length}`);
    console.log(usage);
    process.exit(1);
  }
  if (argv._[0] !== "migrate" && argv._[0] !== "info" && argv._[0] !== "drop") {
    console.error(`Invalid command: ${argv._[0]}`);
    console.log(usage);
    process.exit(1);
  }
};

export const readMigrationFiles = async (directory: string) => {
  const files = await fs.readdir(directory, { withFileTypes: true });
  const migrationFiles = files
    .filter((file) => file.isFile() && file.name.endsWith(".sql"))
    .map((file) => path.join(directory, file.name));
  migrationFiles.sort();
  const results: {
    fullFilePath: string;
    filename: string;
    hash: string;
    contents: string;
  }[] = [];
  for (const fullFilePath of migrationFiles) {
    const hash = await hashFile(fullFilePath);
    const contents = await fs.readFile(fullFilePath, "utf8");
    results.push({
      fullFilePath,
      filename: path.basename(fullFilePath),
      hash,
      contents,
    });
  }
  return results;
};
