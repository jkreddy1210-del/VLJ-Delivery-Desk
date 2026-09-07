import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    // Delivery Desk uses its own MySQL database (vlj_erp).
    // Keep the Prisma CLI/migrations connection on DATABASE_URL.
    url: process.env.DATABASE_URL!,
  },
});
