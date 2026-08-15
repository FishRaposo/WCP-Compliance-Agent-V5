import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("root package exposes the complete portfolio gate surface", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.packageManager, "pnpm@9.15.0");
  for (const script of ["typecheck", "lint", "build", "test", "test:golden", "evidence", "test:e2e"]) {
    assert.equal(typeof pkg.scripts[script], "string", `missing root script: ${script}`);
  }
  assert.match(pkg.scripts["test:golden"], /tests\/eval/);
  assert.equal(typeof pkg.devDependencies["@playwright/test"], "string");
});

test("CI covers clean installs, evidence, browser smoke, Docker, and source hygiene", () => {
  const workflow = read(".github/workflows/ci.yml");

  for (const expected of [
    "pnpm install --frozen-lockfile",
    "poetry install --no-interaction",
    "poetry check --lock",
    "pnpm evidence",
    "playwright install --with-deps chromium",
    "pnpm test:e2e",
    "docker compose -f infra/docker-compose.prod.yml config",
    "docker compose -f infra/docker-compose.prod.yml build",
    "gitleaks/gitleaks-action",
  ]) {
    assert.match(workflow, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), expected);
  }
});

test("Docker builds use repository-local manifests and pinned package managers", () => {
  const compose = read("infra/docker-compose.prod.yml");
  for (const service of ["gateway", "agent", "web"]) {
    assert.match(
      compose,
      new RegExp(`${service}:\\r?\\n(?:.|\\r?\\n)*?context: \\.\\.(?:.|\\r?\\n)*?dockerfile: apps/${service}/Dockerfile`),
    );
  }

  for (const service of ["gateway", "agent", "web"]) {
    const dockerfile = read(`apps/${service}/Dockerfile`);
    assert.match(dockerfile, /pnpm@9\.15\.0/);
    assert.match(dockerfile, /COPY package\.json pnpm-lock\.yaml pnpm-workspace\.yaml/);
  }

  for (const service of ["compliance-core", "data-platform"]) {
    const dockerfile = read(`apps/${service}/Dockerfile`);
    assert.match(dockerfile, /poetry install --only main --no-interaction --no-root/);
  }
});

test("operational package surfaces contain no sibling or Git-installed dependencies", () => {
  const files = [
    "package.json",
    "pnpm-workspace.yaml",
    "apps/agent/package.json",
    "apps/gateway/package.json",
    "apps/web/package.json",
    "apps/compliance-core/pyproject.toml",
    "apps/data-platform/pyproject.toml",
    "apps/agent/Dockerfile",
    "apps/gateway/Dockerfile",
    "apps/web/Dockerfile",
    "apps/compliance-core/Dockerfile",
    "apps/data-platform/Dockerfile",
  ];
  const forbidden = /(git\+https?:|operator-shared-core|\.\.\/shared-core|from shared_core|import shared_core)/;

  for (const file of files) {
    assert.doesNotMatch(read(file), forbidden, file);
  }
});
