import { NextResponse } from "next/server";
import { route } from "@/lib/errors";
import { listRevisions } from "@/lib/revisions";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  return NextResponse.json(await listRevisions(user, (await params).id));
});
