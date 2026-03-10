import { PrismaClient } from "@prisma/client";

const databaseUrl = Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl
});

export default prisma;