import { neon } from "@neondatabase/serverless";

export function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Missing DATABASE_URL. In Vercel open Storage → Create Database → Neon (this sets DATABASE_URL), then redeploy.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

let sql: ReturnType<typeof neon> | null = null;

export function usesPostgres(): boolean {
  if (getDatabaseUrl()) return true;
  if (process.env.VERCEL) throw new DatabaseNotConfiguredError();
  return false;
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();
  if (!sql) sql = neon(url);
  return sql;
}
