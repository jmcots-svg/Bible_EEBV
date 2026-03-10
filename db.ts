import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
});