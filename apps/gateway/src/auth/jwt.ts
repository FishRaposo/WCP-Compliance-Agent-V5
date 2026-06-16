import { SignJWT } from "jose";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function signToken(
  userId: string,
  email: string,
  role: string,
  tenantId = "default",
): Promise<string> {
  return new SignJWT({ user_id: userId, email, role, tenant_id: tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}
