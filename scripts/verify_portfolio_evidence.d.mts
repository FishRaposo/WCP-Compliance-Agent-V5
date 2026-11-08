export interface EvidenceManifestEntry {
  name: string;
  sha256?: string;
  bytes?: number;
}

export interface EvidenceManifest {
  schema_version: string;
  reproducibility_sha256: string;
  entries: EvidenceManifestEntry[];
  [key: string]: unknown;
}

export function verifyEvidenceBundle(
  directory: string,
  options?: { goldenPath?: string },
): EvidenceManifest;
