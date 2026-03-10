import { PrismaClient } from "./generated/client/deno/edge.ts";

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
  errorFormat: "pretty"
});