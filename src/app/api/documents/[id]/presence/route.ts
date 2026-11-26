import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/errors";
import { heartbeat, leave } from "@/lib/presence";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({ mode: z.enum(["editing", "viewing"]) });

export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { mode } = body.parse(await readJson(req));
  return NextResponse.json(await heartbeat(user, (await params).id, mode));
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  await leave(user, (await params).id);
  return new NextResponse(null, { status: 204 });
});
