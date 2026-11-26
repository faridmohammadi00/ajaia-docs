import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { cache } from "react";
import { collections } from "./db";
import { HttpError } from "./errors";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-token";

export interface SessionUser {
  _id: ObjectId;
  id: string;
  email: string;
  name: string;
}

export async function setSessionCookie(userId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Deduped per request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const sub = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sub) return null;
  const { users } = await collections();
  const user = await users.findOne(
    { _id: new ObjectId(sub) },
    { projection: { email: 1, name: 1 } },
  );
  return user ? { _id: user._id, id: user._id.toHexString(), email: user.email, name: user.name } : null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}
