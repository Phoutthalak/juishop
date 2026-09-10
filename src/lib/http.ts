import { NextResponse } from "next/server";
import { DatabaseNotConfiguredError } from "./db";

export function errorResponse(e: unknown, fallback = "Request failed", fallbackStatus = 500) {
  const message = e instanceof Error ? e.message : fallback;
  const status =
    e instanceof DatabaseNotConfiguredError || message.includes("DATABASE_URL")
      ? 503
      : fallbackStatus;
  return NextResponse.json({ error: message }, { status });
}
