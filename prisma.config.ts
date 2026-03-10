import { defineConfig } from "npm:prisma@latest";

export default defineConfig({
  datasources: {
    db: {
      url: Deno.env.get("DATABASE_URL")!
    }
  }
});