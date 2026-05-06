import { describe, it, expect } from "vitest";

describe("JWT signing", () => {
  it("signs a token successfully", async () => {
    const { signToken } = await import("../../src/auth/jwt.js");
    const token = await signToken("user-1", "test@example.com", "admin");
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("signs tokens with different user data", async () => {
    const { signToken } = await import("../../src/auth/jwt.js");
    const token1 = await signToken("user-1", "a@test.com", "admin");
    const token2 = await signToken("user-2", "b@test.com", "analyst");
    expect(token1).not.toBe(token2);
  });
});

describe("auth middleware", () => {
  it("auth middleware is defined", async () => {
    const { authMiddleware } = await import("../../src/middleware/auth.js");
    expect(authMiddleware).toBeDefined();
    expect(typeof authMiddleware).toBe("function");
  });
});
