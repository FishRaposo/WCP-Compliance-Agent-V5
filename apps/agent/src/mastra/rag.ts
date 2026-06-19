import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { MDocument, createVectorQueryTool } from "@mastra/rag";
import { PgVector } from "@mastra/pg";
import { LibSQLVector } from "@mastra/libsql";
import type { MastraVector } from "@mastra/core/vector";

import { config, isMockMode } from "../config.js";

/**
 * Davis-Bacon wage RAG — the embeddings-backed retrieval showcase.
 *
 * Real mode (LLM_MODE=real + OPENAI_API_KEY): a Mastra vector store (PgVector when
 * VECTOR_DB_URL is Postgres, otherwise embedded LibSQL) is registered on the Mastra instance
 * under `vectors.davisBacon`, and `wageQueryTool` (createVectorQueryTool) gives the verdict
 * agent embeddings-based retrieval over wage determinations.
 *
 * Mock mode (no API key — embeddings unavailable): RAG is disabled and the agent falls back
 * to the keyless `searchTool` (Compliance Core's local corpus), so the full stack still runs
 * with zero external services.
 */

export const RAG_INDEX_NAME = "davis_bacon_wages";
export const RAG_VECTOR_STORE_NAME = "davisBacon";

// Index dimension must match the embedder's output width. Keyed by model so changing
// EMBEDDING_MODEL doesn't silently create a mismatched index.
const EMBED_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};
const EMBED_DIMENSION = EMBED_DIMENSIONS[config.EMBEDDING_MODEL] ?? 1536;

/** RAG requires real embeddings, which require an OpenAI key. */
export const ragEnabled = !isMockMode && Boolean(config.OPENAI_API_KEY);

const embedder = openai.embedding(config.EMBEDDING_MODEL);

function buildVectorStore(): MastraVector {
  const url = config.VECTOR_DB_URL;
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PgVector({ id: RAG_VECTOR_STORE_NAME, connectionString: url });
  }
  return new LibSQLVector({ id: RAG_VECTOR_STORE_NAME, url });
}

/** The registered vector store, or null in mock mode (no embeddings). */
export const wageVectorStore: MastraVector | null = ragEnabled ? buildVectorStore() : null;

/** Embeddings-backed RAG-as-a-tool for the verdict agent. Null when RAG is disabled. */
export const wageQueryTool = ragEnabled
  ? createVectorQueryTool({
      id: "wage-query",
      description:
        "Retrieve the most relevant Davis-Bacon wage determinations and regulation text for a query via semantic search.",
      vectorStoreName: RAG_VECTOR_STORE_NAME,
      indexName: RAG_INDEX_NAME,
      model: embedder,
      enableFilter: true,
    })
  : null;

/**
 * Seed corpus of Davis-Bacon wage determinations. A small, representative set so the RAG
 * tool returns meaningful context out of the box. In production this would be ingested from
 * the DBWD source of record in the Data Platform.
 */
const SEED_CORPUS: Array<{ text: string; metadata: Record<string, unknown> }> = [
  {
    text: "General Decision DC20240001 (Building Construction, Washington, DC). Carpenter: basic hourly rate $34.86, fringe $12.40. Reference 29 CFR 5.5; 40 U.S.C. 3142. Effective 2024-01-05.",
    metadata: { trade: "Carpenter", locality: "Washington, DC", rate: 34.86, fringe: 12.4, wage_determination_number: "DC20240001" },
  },
  {
    text: "General Decision DC20240001 (Building Construction, Washington, DC). Electrician: basic hourly rate $46.10, fringe $18.75. Overtime must be paid at 1.5x the basic rate for hours over 40. Reference 29 CFR 5.5(a)(1). Effective 2024-01-05.",
    metadata: { trade: "Electrician", locality: "Washington, DC", rate: 46.1, fringe: 18.75, wage_determination_number: "DC20240001" },
  },
  {
    text: "General Decision DC20240001 (Building Construction, Washington, DC). Laborer (Group 1): basic hourly rate $24.50, fringe $9.10. Reference 29 CFR 5.5. Effective 2024-01-05.",
    metadata: { trade: "Laborer", locality: "Washington, DC", rate: 24.5, fringe: 9.1, wage_determination_number: "DC20240001" },
  },
  {
    text: "Davis-Bacon Act, 40 U.S.C. 3142: laborers and mechanics on federally funded construction contracts over $2,000 must be paid no less than the locally prevailing wages and fringe benefits determined by the Secretary of Labor.",
    metadata: { regulation: "40 U.S.C. 3142", topic: "prevailing wage requirement" },
  },
  {
    text: "29 CFR 5.5(a)(1): contractors must pay the full amount of wages and bona fide fringe benefits (or cash equivalents) computed at rates not less than those in the applicable wage determination. Overtime at 1.5x the basic rate applies to hours worked over 40 in a workweek.",
    metadata: { regulation: "29 CFR 5.5", topic: "wage and overtime computation" },
  },
];

/**
 * Ingest the seed corpus: chunk -> embed -> createIndex -> upsert. Idempotent enough for
 * startup. No-op when RAG is disabled.
 */
export async function ingestSeedCorpus(): Promise<{ ingested: number }> {
  if (!ragEnabled || !wageVectorStore) return { ingested: 0 };

  const chunks: Array<{ text: string; metadata: Record<string, unknown> }> = [];
  for (const entry of SEED_CORPUS) {
    const doc = MDocument.fromText(entry.text, entry.metadata);
    const docChunks = await doc.chunk({ strategy: "recursive", maxSize: 512, overlap: 50 });
    for (const c of docChunks) {
      chunks.push({ text: c.text, metadata: { ...entry.metadata, text: c.text } });
    }
  }

  const { embeddings } = await embedMany({
    model: embedder,
    values: chunks.map((c) => c.text),
  });

  await wageVectorStore.createIndex({
    indexName: RAG_INDEX_NAME,
    dimension: EMBED_DIMENSION,
    metric: "cosine",
  });
  await wageVectorStore.upsert({
    indexName: RAG_INDEX_NAME,
    vectors: embeddings,
    metadata: chunks.map((c) => c.metadata),
  });

  return { ingested: chunks.length };
}
