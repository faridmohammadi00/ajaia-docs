import { NextResponse } from "next/server";
import { route } from "@/lib/errors";
import { getRevision } from "@/lib/revisions";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; revId: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, revId } = await params;
  return NextResponse.json(await getRevision(user, id, revId));
});
