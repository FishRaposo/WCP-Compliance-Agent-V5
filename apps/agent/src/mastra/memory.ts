import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";

import { config, isMockMode } from "../config.js";
import { ragEnabled } from "./rag.js";

/**
 * Per-contractor memory for the verdict agent.
 *
 * Threads/resources are keyed by contractor so the agent can recall a contractor's prior
 * decisions and recurring violation patterns across payroll submissions (resource-scoped).
 * Semantic recall (embeddings over past messages) is enabled only in real mode where an
 * embedder is available; storage-backed recency always works.
 */

// In-memory libSQL for mock/test runs so no files are written and CI stays hermetic.
const memoryUrl = isMockMode || config.NODE_ENV === "test" ? "file::memory:" : config.MEMORY_DB_URL;

const WORKING_MEMORY_TEMPLATE = `# Contractor Compliance Profile
- Contractor:
- Recent verdicts (latest first):
- Recurring violation types:
- Notes for reviewers:
`;

function buildMemory(): Memory {
  return new Memory({
    storage: new LibSQLStore({ id: "wcp-agent-memory", url: memoryUrl }),
    ...(ragEnabled
      ? {
          vector: new LibSQLVector({ id: "wcp-agent-memory-vectors", url: memoryUrl }),
          embedder: `openai/${config.EMBEDDING_MODEL}`,
        }
      : {}),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: WORKING_MEMORY_TEMPLATE,
      },
      ...(ragEnabled
        ? { semanticRecall: { topK: 3, messageRange: 2, scope: "resource" as const } }
        : {}),
    },
  });
}

export const verdictMemory = buildMemory();

/** Build the per-call memory selector keyed by contractor id (falls back to job id). */
export function memoryFor(contractorName: string, jobId: string) {
  const resource = contractorName.trim() ? `contractor:${contractorName.trim()}` : `job:${jobId}`;
  return { thread: `${resource}:thread`, resource };
}
