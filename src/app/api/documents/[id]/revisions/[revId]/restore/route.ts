import { NextResponse } from "next/server";
import { route } from "@/lib/errors";
import { restoreRevision } from "@/lib/revisions";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; revId: string }> };

export const POST = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, revId } = await params;
  return NextResponse.json(await restoreRevision(user, id, revId));
});
