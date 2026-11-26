import { NextResponse } from "next/server";
import { z } from "zod";
import { shareDocument, shareRoleSchema } from "@/lib/documents";
import { readJson, route } from "@/lib/errors";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: shareRoleSchema,
});

export const POST = route(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { email, role } = body.parse(await readJson(req));
  return NextResponse.json(await shareDocument(user, (await params).id, email, role));
});
