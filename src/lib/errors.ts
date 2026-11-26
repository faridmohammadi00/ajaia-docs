import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Document not found");
export const forbidden = (msg = "You do not have permission to do this") => new HttpError(403, msg);

export function toErrorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, ...err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    return NextResponse.json(
      { error: field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid input") },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}
