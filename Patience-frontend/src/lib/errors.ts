import { ApiError } from "../api/client";

/** Extracts a user-facing message from an unknown thrown value, falling back to a default. */
export function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
