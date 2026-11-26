import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { collections } from "@/lib/db";
import { HttpError, readJson, route } from "@/lib/errors";
import { setSessionCookie } from "@/lib/session";

const body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const POST = route(async (req: Request) => {
  const { email, password } = body.parse(await readJson(req));
  const { users } = await collections();
  const user = await users.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid email or password");
  }
  await setSessionCookie(user._id.toHexString());
  return NextResponse.json({ user: { id: user._id.toHexString(), email: user.email, name: user.name } });
});
