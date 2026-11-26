import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("ajaia_docs"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

let cached: z.infer<typeof schema> | undefined;

// Lazy so `next build` does not need runtime secrets.
export function env() {
  return (cached ??= schema.parse(process.env));
}
