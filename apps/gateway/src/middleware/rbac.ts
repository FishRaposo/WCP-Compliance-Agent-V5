import type { Context, Next } from "hono";
import { isRbacEnforced } from "../config.js";

export type Role = "admin" | "auditor" | "viewer";

interface UserClaims {
  user_id?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
}

function getUser(c: Context): UserClaims {
  return (c.get("user") as UserClaims | undefined) ?? {};
}

/** Tenant the current request operates within (defaults to the implicit "default" tenant). */
export function getTenantId(c: Context): string {
  return getUser(c).tenant_id ?? "default";
}

/** Role of the authenticated principal, if any. */
export function getRole(c: Context): string | undefined {
  return getUser(c).role;
}

/** Identity to attribute mutations to (email preferred, then user_id). */
export function getActor(c: Context): string {
  const user = getUser(c);
  return user.email ?? user.user_id ?? "reviewer";
}

/**
 * Gate a route on one of the allowed roles.
 *
 * No-op when `RBAC_ENFORCED` is false (the default) so existing flows keep
 * working; when enforced, a principal whose role is not in `allowed` gets 403.
 */
export function requireRole(...allowed: Role[]) {
  return async (c: Context, next: Next) => {
    if (!isRbacEnforced) return next();
    const role = getRole(c);
    if (!role || !allowed.includes(role as Role)) {
      return c.json({ error: "Insufficient permissions for this action" }, 403);
    }
    return next();
  };
}
