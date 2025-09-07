import { PrismaClient } from "@prisma/client";

const g = global as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient;

try {
  // Use DIRECT_URL to avoid prepared statement conflicts with Supabase pooling
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
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
