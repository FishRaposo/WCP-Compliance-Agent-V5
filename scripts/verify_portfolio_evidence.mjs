import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredFiles = ["manifest.json", "report.json", "report.md", "checksums.sha256"];
const runtimeOnlyKeys = new Set([
  "created_at",
  "updated_at",
  "timestamp",
  "started_at",
  "finished_at",
  "runtime_ms",
  "duration_ms",
  "elapsed_ms",
  "latency_ms",
  "filesystem_path",
  "cwd",
  "environment",
  "generated_id",
  "idempotency_key",
  "request_id",
  "trace_id",
  "stream_id",
  "event_id",
  "job_id",
  "ordered_ids",
  "resumed_ids",
]);
const secretKeyPattern = /(token|secret|password|authorization|api[_-]?key|credential)/i;
const secretValuePatterns = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{8,}/i,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
];

function fail(message) {
  throw new Error(message);
}

function parseJson(path, name) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`Malformed JSON in ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) result[key] = canonicalValue(value[key]);
    }
    return result;
  }
  return String(value);
}

function normalizeEvidence(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return canonicalValue(value);
  }
  if (typeof value === "string") {
    return secretValuePatterns.some((pattern) => pattern.test(value)) ? "[REDACTED]" : value;
  }
  if (Array.isArray(value)) return value.map(normalizeEvidence);
  if (typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      if (runtimeOnlyKeys.has(key) || value[key] === undefined) continue;
      result[key] = secretKeyPattern.test(key) ? "[REDACTED]" : normalizeEvidence(value[key]);
    }
    return result;
  }
  return String(value);
}

function stableSerialize(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) fail("Malformed manifest: expected an object");
  if (manifest.schema_version !== "v1") fail("Malformed manifest: schema_version must be v1");
  if (typeof manifest.artifact_id !== "string" || manifest.artifact_id.length === 0) {
    fail("Malformed manifest: artifact_id must be a non-empty string");
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    fail("Malformed manifest: entries must be a non-empty array");
  }
  if (
    manifest.reproducibility_sha256 !== undefined &&
    (typeof manifest.reproducibility_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.reproducibility_sha256))
  ) {
    fail("Malformed manifest: reproducibility_sha256 must be lowercase SHA-256 when declared");
  }
  const seen = new Set();
  for (const entry of manifest.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) fail("Malformed manifest entry");
    if (typeof entry.name !== "string" || basename(entry.name) !== entry.name || entry.name.includes("..")) {
      fail("Malformed manifest entry name");
    }
    if (seen.has(entry.name)) fail(`Malformed manifest: duplicate entry ${entry.name}`);
    seen.add(entry.name);
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      fail(`Malformed manifest checksum for ${entry.name}`);
    }
    if (entry.bytes !== undefined && (!Number.isInteger(entry.bytes) || entry.bytes < 0)) {
      fail(`Malformed manifest byte count for ${entry.name}`);
    }
  }
  for (const name of ["report.json", "report.md"]) {
    if (!seen.has(name)) fail(`Malformed manifest: required entry ${name} is not declared`);
  }
}

function parseChecksumIndex(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const checksums = new Map();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([^\\/]+)$/.exec(line);
    if (!match) fail(`Malformed checksums.sha256 line: ${line}`);
    if (checksums.has(match[2])) fail(`Malformed checksums.sha256: duplicate ${match[2]}`);
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

/** Verify integrity, canonical reproducibility, and optional golden parity. */
export function verifyEvidenceBundle(directory, options = {}) {
  const bundleDirectory = resolve(directory);
  for (const name of requiredFiles) {
    if (!existsSync(resolve(bundleDirectory, name))) fail(`Missing required file: ${name}`);
  }

  const manifest = parseJson(resolve(bundleDirectory, "manifest.json"), "manifest.json");
  validateManifest(manifest);
  const checksums = parseChecksumIndex(resolve(bundleDirectory, "checksums.sha256"));
  if (checksums.size !== manifest.entries.length) {
    fail("checksums.sha256 does not contain exactly the declared manifest entries");
  }

  for (const entry of manifest.entries) {
    const artifactPath = resolve(bundleDirectory, entry.name);
    if (!existsSync(artifactPath)) fail(`Missing required file: ${entry.name}`);
    const content = readFileSync(artifactPath);
    const actualChecksum = sha256(content);
    if (actualChecksum !== entry.sha256) fail(`Checksum mismatch for ${entry.name}`);
    if (entry.bytes !== undefined && statSync(artifactPath).size !== entry.bytes) {
      fail(`Byte count mismatch for ${entry.name}`);
    }
    if (checksums.get(entry.name) !== entry.sha256) fail(`checksums.sha256 mismatch for ${entry.name}`);
  }

  const report = parseJson(resolve(bundleDirectory, "report.json"), "report.json");
  const normalizedReport = normalizeEvidence(report);
  const reproducibilityHash = sha256(Buffer.from(stableSerialize(normalizedReport), "utf8"));
  if (manifest.reproducibility_sha256 !== undefined && reproducibilityHash !== manifest.reproducibility_sha256) {
    fail("Reproducibility hash mismatch for normalized report.json");
  }

  if (options.goldenPath) {
    if (!existsSync(options.goldenPath)) fail(`Missing golden fixture: ${options.goldenPath}`);
    const golden = normalizeEvidence(parseJson(options.goldenPath, "golden fixture"));
    if (stableSerialize(normalizedReport) !== stableSerialize(golden)) {
      fail("Normalized report.json does not match the golden fixture");
    }
  }
  return manifest;
}

function parseArguments(argv) {
  const args = [...argv];
  const directory = args.shift();
  if (!directory) fail("Usage: verify_portfolio_evidence.mjs <directory> [--golden <path>]");
  let goldenPath;
  while (args.length > 0) {
    const option = args.shift();
    if (option !== "--golden" || args.length === 0) fail(`Unknown or incomplete option: ${option}`);
    goldenPath = resolve(args.shift());
  }
  return { directory, goldenPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { directory, goldenPath } = parseArguments(process.argv.slice(2));
    const manifest = verifyEvidenceBundle(directory, { goldenPath });
    process.stdout.write(`Evidence verified: ${resolve(directory)}\nReproducibility SHA-256: ${manifest.reproducibility_sha256}\n`);
  } catch (error) {
    process.stderr.write(`Evidence verification failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
