import { exec } from "node:child_process";

export const execute = (cmd: string) => {
  const child = exec(cmd);
  let scriptOutput = "";
  let scriptError = "";

  if (!child.stdout || !child.stderr) {
    return { output: "", error: "", exitCode: 1 };
  }

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (data) => {
    scriptOutput += data.toString();
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (data) => {
    scriptError += data.toString();
  });

  return new Promise((res, rej) =>
    child.on("close", function (code) {
      res({ output: scriptOutput, error: scriptError, exitCode: code ?? 1 });
    })
  ) as Promise<{ output: string; error: string; exitCode: number }>;
};

export const includesAll = (output: string, expected: string[]) =>
  expected.every((x) => output.includes(x));

export const excludesAll = (output: string, expected: string[]) =>
  expected.every((x) => !output.includes(x));

export const includesExcludesAll = (
  output: string,
  includes: string[],
  excludes: string[]
) => includesAll(output, includes) && excludesAll(output, excludes);

export const assertIncludesAll = (
  { output, error }: { output: string; error: string },
  expected: string[]
) => {
  if (!includesAll(output + error, expected)) {
    console.log(output);
    console.error(error);
    throw new Error(`Expected ${expected} to be in output.`);
  }
};
export const assertExcludesAll = (
  { output, error }: { output: string; error: string },
  expected: string[]
) => {
  if (!excludesAll(output + error, expected)) {
    console.log(output);
    console.error(error);
    throw new Error(`Expected ${expected} to be be excluded from output.`);
  }
};

export const assertIncludesExcludesAll = (
  { output, error }: { output: string; error: string },
  includes: string[],
  excludes: string[]
) => {
  assertIncludesAll({ output, error }, includes);
  assertExcludesAll({ output, error }, excludes);
};
