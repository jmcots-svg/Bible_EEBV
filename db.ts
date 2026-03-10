import { PrismaClient } from "./generated/client/deno/edge.ts";
import { withAccelerate } from "npm:@prisma/extension-accelerate@1.2.1";

export const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
}).$extends(withAccelerate());