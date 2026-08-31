import { PrismaClient } from "@/generated/prisma/client.ts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const parsedDatabaseUrl = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: parsedDatabaseUrl.hostname,
    port: parsedDatabaseUrl.port ? Number(parsedDatabaseUrl.port) : 3306,
    user: decodeURIComponent(parsedDatabaseUrl.username),
    password: decodeURIComponent(parsedDatabaseUrl.password),
    database: parsedDatabaseUrl.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 10_000,
    acquireTimeout: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
