import fs from "fs/promises";
import { execute } from "../test/utils";

const next = async (readme: string, from: number) => {
  if (readme.indexOf("```bash", from) === -1) {
    return { nextReadme: readme, nextIndex: -1 };
  }

  const startScript = readme.indexOf("```bash", from) + 7;
  const endScript = readme.indexOf("```", startScript);
  const script = readme.slice(startScript, endScript);
  const { output } = await execute(script);
  const startOutput = output.indexOf("```text", endScript) + 7;
  const endOutput = output.indexOf("```", startOutput);
  return {
    nextReadme:
      readme.slice(0, startOutput) + output.slice(startOutput, endOutput),
    nextIndex: endOutput + 3,
  };
};

(async () => {
  let readme = await fs.readFile("./README.md", "utf8");

  const start = readme.indexOf("[comment]: <> (Start of examples)");

  let index = start;

  while (true) {
    const { nextReadme, nextIndex } = await next(readme, index);
    if (nextIndex === -1) {
      break;
    }

    readme = nextReadme;
    index = nextIndex;
  }

  const end = readme.indexOf("[comment]: <> (End of examples)");

  await fs.writeFile("./README.md", readme);
})();
