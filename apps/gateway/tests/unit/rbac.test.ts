import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireRole, getTenantId, getActor, getRole } from "../../src/middleware/rbac.js";

// RBAC_ENFORCED defaults to false in the test environment, so requireRole is a
// pass-through; these tests pin that default-safe behavior plus the helpers.

describe("requireRole (RBAC_ENFORCED=false default)", () => {
  it("passes through when enforcement is off, even with no user", async () => {
    const app = new Hono();
    app.post("/x", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/x", { method: "POST" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("passes through for a viewer when enforcement is off", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("user", { role: "viewer", tenant_id: "acme" });
      await next();
    });
    app.post("/x", requireRole("admin", "auditor"), (c) => c.json({ ok: true }));
    const res = await app.request("/x", { method: "POST" });
    expect(res.status).toBe(200);
  });
});

describe("rbac helpers", () => {
  it("getTenantId falls back to 'default' when unset", async () => {
    const app = new Hono();
    let tenant = "";
    app.get("/t", (c) => {
      tenant = getTenantId(c);
      return c.text("ok");
    });
    await app.request("/t");
    expect(tenant).toBe("default");
  });

  it("getTenantId reads the tenant from the user claims", async () => {
    const app = new Hono();
    let tenant = "";
    app.use("*", async (c, next) => {
      c.set("user", { tenant_id: "acme", role: "admin", email: "a@acme.dev" });
      await next();
    });
    app.get("/t", (c) => {
      tenant = getTenantId(c);
      return c.text("ok");
    });
    await app.request("/t");
    expect(tenant).toBe("acme");
  });

  it("getRole and getActor reflect the user claims", async () => {
    const app = new Hono();
    let role: string | undefined;
    let actor = "";
    app.use("*", async (c, next) => {
      c.set("user", { role: "auditor", email: "reviewer@acme.dev" });
      await next();
    });
    app.get("/t", (c) => {
      role = getRole(c);
      actor = getActor(c);
      return c.text("ok");
    });
    await app.request("/t");
    expect(role).toBe("auditor");
    expect(actor).toBe("reviewer@acme.dev");
  });

  it("getActor defaults to 'reviewer' when no identity is present", async () => {
    const app = new Hono();
    let actor = "";
    app.get("/t", (c) => {
      actor = getActor(c);
      return c.text("ok");
    });
    await app.request("/t");
    expect(actor).toBe("reviewer");
  });
});
