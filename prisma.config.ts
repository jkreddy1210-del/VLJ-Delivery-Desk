import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Use Supabase's direct connection for Prisma CLI/migrations when provided.
    // Fall back to DATABASE_URL for local development.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
