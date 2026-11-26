import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocument, listDocuments } from "@/lib/documents";
import { readJson, route } from "@/lib/errors";
import { requireUser } from "@/lib/session";

const body = z.object({ title: z.string().optional() });

export const GET = route(async () => {
  return NextResponse.json(await listDocuments(await requireUser()));
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const input = body.parse(await readJson(req));
  return NextResponse.json(await createDocument(user, input), { status: 201 });
});
