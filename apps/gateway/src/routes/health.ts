import { Hono } from "hono";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

export const healthRoutes = new Hono();

const __dirname = dirname(fileURLToPath(import.meta.url));
let version = "5.0.0";
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));
  version = pkg.version ?? "5.0.0";
} catch {
  // Keep the default version when package metadata is unavailable.
}

healthRoutes.get("/health", (c) => c.json({ status: "ok", version, service: "gateway" }));
