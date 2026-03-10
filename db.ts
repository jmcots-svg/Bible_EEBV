import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL")
});

export default prisma;