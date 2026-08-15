import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalHash,
  normalizeEvidence,
  runPortfolioScenario,
  stableSerialize,
  writeEvidenceBundle,
} from "../../../scripts/portfolio_demo.js";
import { verifyEvidenceBundle } from "../../../scripts/verify_portfolio_evidence.mjs";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(resolve(tmpdir(), "wcp-evidence-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function sampleReport(): Record<string, unknown> {
  return {
    schema_version: "v1",
    scenario: "offline-portfolio",
    decision: { verdict: "approved", trust_score: 0.95 },
    sse: { ordered_ids: ["local-1", "local-2"] },
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("portfolio evidence canonicalization", () => {
  it("serializes and hashes equivalent objects identically", () => {
    const first = { z: 2, nested: { b: true, a: "value" }, a: 1 };
    const second = { a: 1, nested: { a: "value", b: true }, z: 2 };

    expect(stableSerialize(first)).toBe(stableSerialize(second));
    expect(canonicalHash(first)).toBe(canonicalHash(second));
    expect(canonicalHash(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("redacts secret keys and credential-shaped values while excluding runtime fields", () => {
    const normalized = normalizeEvidence({
      result: "approved",
      api_key: ["sk", "secret-key-material"].join("-"),
      authorization: ["Bearer", "live-access-token"].join(" "),
      nested: {
        password: "do-not-write-this",
        note: ["Bearer", "another-live-token"].join(" "),
        trace_id: "trace-generated-id",
        idempotency_key: "job-generated-id",
        stream_id: "stream-generated-id",
        latency_ms: 1234,
        created_at: "2026-08-14T12:00:00Z",
      },
    });

    expect(normalized).toEqual({
      authorization: "[REDACTED]",
      api_key: "[REDACTED]",
      nested: { note: "[REDACTED]", password: "[REDACTED]" },
      result: "approved",
    });
    expect(
      normalizeEvidence({
        sse: {
          ordered_ids: ["local-1", "local-2"],
          resumed_ids: ["local-2"],
        },
      }),
    ).toEqual({ sse: {} });
    expect(JSON.stringify(normalized)).not.toContain("secret-key-material");
    expect(JSON.stringify(normalized)).not.toContain("live-access-token");
  });
});

describe("portfolio evidence bundle", () => {
  it("writes a v1 bundle whose declared bytes and checksums verify", () => {
    const directory = temporaryDirectory();
    writeEvidenceBundle(directory, sampleReport());

    const verified = verifyEvidenceBundle(directory);

    expect(verified.schema_version).toBe("v1");
    expect(verified.reproducibility_sha256).toBe(canonicalHash(normalizeEvidence(sampleReport())));
    expect(verified.entries.map((entry: { name: string }) => entry.name)).toEqual([
      "report.json",
      "report.md",
    ]);
    expect(readFileSync(resolve(directory, "checksums.sha256"), "utf8")).toMatch(
      /^[a-f0-9]{64}  report\.json\r?\n[a-f0-9]{64}  report\.md\r?\n$/,
    );
  });

  it("rejects tampering with a clear checksum error", () => {
    const directory = temporaryDirectory();
    writeEvidenceBundle(directory, sampleReport());
    writeFileSync(resolve(directory, "report.json"), '{"tampered":true}\n');

    expect(() => verifyEvidenceBundle(directory)).toThrow(/checksum mismatch.*report\.json/i);
  });

  it("rejects missing files and malformed manifests", () => {
    const missing = temporaryDirectory();
    writeEvidenceBundle(missing, sampleReport());
    rmSync(resolve(missing, "report.md"));
    expect(() => verifyEvidenceBundle(missing)).toThrow(/missing required file.*report\.md/i);

    const malformed = temporaryDirectory();
    writeEvidenceBundle(malformed, sampleReport());
    writeFileSync(resolve(malformed, "manifest.json"), "{not-json");
    expect(() => verifyEvidenceBundle(malformed)).toThrow(/malformed json.*manifest\.json/i);
  });

  it("returns a nonzero CLI exit for invalid evidence", () => {
    const directory = temporaryDirectory();
    writeEvidenceBundle(directory, sampleReport());
    writeFileSync(resolve(directory, "checksums.sha256"), "bad-checksum  report.json\n");

    const result = spawnSync(
      process.execPath,
      [resolve(process.cwd(), "../../scripts/verify_portfolio_evidence.mjs"), directory],
      { cwd: resolve(process.cwd(), "../.."), encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/checksums\.sha256/i);
  });

  it("produces the same normalized scenario and hash twice", async () => {
    const first = await runPortfolioScenario();
    const second = await runPortfolioScenario();

    expect(first).toEqual(second);
    expect(canonicalHash(first)).toBe(canonicalHash(second));
  }, 120_000);

  it("matches the committed normalized golden fixture", async () => {
    const report = await runPortfolioScenario();
    const golden = JSON.parse(
      readFileSync(resolve(process.cwd(), "../../tests/fixtures/golden/portfolio-evidence.json"), "utf8"),
    );

    expect(report).toEqual(golden);
  }, 60_000);
});
