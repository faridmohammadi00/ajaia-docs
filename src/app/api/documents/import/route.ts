import { NextResponse } from "next/server";
import { createDocument } from "@/lib/documents";
import { HttpError, route } from "@/lib/errors";
import { IMPORT_MAX_BYTES, importFile } from "@/lib/import";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > IMPORT_MAX_BYTES + 64 * 1024) throw new HttpError(413, "File is too large (max 2 MB)");

  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected a multipart form upload");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file was uploaded");

  const parsed = await importFile(file.name, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json(await createDocument(user, parsed), { status: 201 });
});
