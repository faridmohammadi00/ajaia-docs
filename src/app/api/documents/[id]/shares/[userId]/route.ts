import { NextResponse } from "next/server";
import { unshareDocument } from "@/lib/documents";
import { route } from "@/lib/errors";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, userId } = await params;
  await unshareDocument(user, id, userId);
  return new NextResponse(null, { status: 204 });
});
