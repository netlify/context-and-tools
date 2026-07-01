import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./netlify/database/migrations",
  dialect: "postgresql",
});
