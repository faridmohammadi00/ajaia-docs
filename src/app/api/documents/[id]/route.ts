import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDocument, getDocument, renameDocument, saveContent } from "@/lib/documents";
import { readJson, route } from "@/lib/errors";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const patch = z.union([
  z.object({ content: z.unknown(), version: z.number().int().positive() }).strict(),
  z.object({ title: z.string() }).strict(),
]);

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  return NextResponse.json(await getDocument(user, (await params).id));
});

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = patch.parse(await readJson(req));
  const result =
    "title" in input
      ? await renameDocument(user, id, input.title)
      : await saveContent(user, id, input.content, input.version);
  return NextResponse.json(result);
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  await deleteDocument(user, (await params).id);
  return new NextResponse(null, { status: 204 });
});
