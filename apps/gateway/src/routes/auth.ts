import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";
import { signToken } from "../auth/jwt.js";

export const authRoutes = new Hono();

const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const dataPlatformClient = new ServiceClient({
  baseUrl: config.DATA_PLATFORM_URL,
});

authRoutes.post("/api/v1/auth/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.format() }, 400);
  }

  try {
    const result = await dataPlatformClient.post<{
      valid: boolean;
      user_id: string | null;
      role: string | null;
    }>("/internal/auth/validate", parsed.data);

    if (!result.valid || !result.user_id || !result.role) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const token = await signToken(result.user_id, parsed.data.email, result.role);

    setCookie(c, "wcp_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 86400,
      secure: config.NODE_ENV === "production",
    });

    return c.json({
      token,
      user_id: result.user_id,
      role: result.role,
    });
  } catch {
    return c.json({ error: "Authentication service error" }, 500);
  }
});
