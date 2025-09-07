import { PrismaClient } from "@prisma/client";

const g = global as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient;

try {
  // Ensure DATABASE_URL has the correct PgBouncer parameters
  let databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.includes('pgbouncer=true')) {
    // Add PgBouncer parameters if not present
    const url = new URL(databaseUrl);
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('sslmode', 'require');
    databaseUrl = url.toString();
  }

  prisma = g.prisma ?? new PrismaClient({ 
    log: ["warn", "error"],
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  if (process.env.NODE_ENV !== "production") g.prisma = prisma;
} catch (error) {
  // Fallback for build time when DATABASE_URL might not be available
  prisma = new PrismaClient({ 
    log: ["warn", "error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "postgresql://dummy:dummy@dummy:5432/dummy"
      }
    }
  });
}

export { prisma };
