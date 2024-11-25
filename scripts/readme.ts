import fs from "fs/promises";
import { execute } from "../test/utils";

const next = async (readme: string, from: number) => {
  const end = readme.indexOf("[comment]: <> (End of examples)");

  if (
    readme.indexOf("```bash", from) < from ||
    readme.indexOf("```bash", from) >= end
  ) {
    return { nextReadme: readme, nextIndex: -1 };
  }

  const startScript = readme.indexOf("```bash", from) + 8;
  const endScript = readme.indexOf("```", startScript);
  const script = readme.slice(startScript, endScript);
  console.log(script);
  const { output } = await execute(script);
  // console.log(output);
  const startOutput = readme.indexOf("```text", endScript) + 8;
  const endOutput = readme.indexOf("```", startOutput);
  return {
    nextReadme: readme.slice(0, startOutput) + output + readme.slice(endOutput),
    nextIndex: endOutput + 3,
  };
};

(async () => {
  let readme = await fs.readFile("./README.md", "utf8");
  const { output } = await execute(`npm exec stepwise-migrations drop -- \\
      --connection=postgresql://postgres:postgres@127.0.0.1:5432/mydb \
      --schema=myschema \\
      --path=./test/migrations-template/ `);

  let index = readme.indexOf("[comment]: <> (Start of examples)");
  let i = 0;
  while (true) {
    const { nextReadme, nextIndex } = await next(readme, index);
    if (nextIndex === -1) {
      break;
    }

    readme = nextReadme;
    index = nextIndex;
    i++;
    // if (i > 1) break;
  }

  await fs.writeFile("./README.md", readme);
})();
