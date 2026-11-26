import { jwtVerify, SignJWT } from "jose";

// Edge-safe: used by middleware, so no Node-only imports here.
export const SESSION_COOKIE = "ajaia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? "");

export async function signSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && /^[a-f0-9]{24}$/.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}
