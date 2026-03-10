import { PrismaClient } from "./generated/client/deno/edge.ts";
import { withAccelerate } from "npm:@prisma/extension-accelerate";

const prisma = new PrismaClient({
  datasourceUrl: Deno.env.get("DATABASE_URL"),
}).$extends(withAccelerate());

export default prisma;