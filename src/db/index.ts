import { Args } from "../utils";
import * as pg from "./pg";

export const dbConnect = async (args: Args) => {
  if (args.connection.startsWith("postgresql://")) {
    return await pg._dbConnect(args);
  }
  // else if (connection.startsWith("mysql://")) {
  //   const client = await mysql._dbConnect(argv);
  //   return {
  //     type: "mysql",
  //     client,
  //     ...mysql,
  //   };
  // }

  throw new Error("Invalid database connection string");
};

export type DbClient = Awaited<ReturnType<typeof dbConnect>>;
