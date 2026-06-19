import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import type { MastraVector } from "@mastra/core/vector";

import { config, isMockMode } from "../config.js";
import { verdictAgent } from "./agents/verdict-agent.js";
import { wcpPipeline, wcpPipelineFromExtracted } from "./workflows/wcp-pipeline.js";
import { humanReviewWorkflow } from "./workflows/human-review.js";
import { allTools } from "./tools/index.js";
import { allScorers } from "./scorers/index.js";
import { wageVectorStore, RAG_VECTOR_STORE_NAME } from "./rag.js";
import { buildLogger, buildObservability } from "./observability.js";

/**
 * The Mastra instance — the single registry that wires the whole agent layer together:
 * the verdict agent, the pipeline + human-review workflows, every tool, the scorers, the
 * Davis-Bacon vector store, durable workflow storage, the logger, and AI tracing.
 *
 * It is embedded in the Hono service (routes drive `mastra.getWorkflow(...).createRun()`),
 * and it is also what `mastra dev` loads for the interactive playground.
 */

const storageUrl =
  isMockMode || config.NODE_ENV === "test" ? "file::memory:" : config.MASTRA_DB_URL;

const vectors: Record<string, MastraVector> | undefined = wageVectorStore
  ? { [RAG_VECTOR_STORE_NAME]: wageVectorStore }
  : undefined;

export const mastra = new Mastra({
  agents: { wcpVerdictAgent: verdictAgent },
  workflows: { wcpPipeline, wcpPipelineFromExtracted, humanReviewWorkflow },
  tools: allTools,
  scorers: allScorers,
  ...(vectors ? { vectors } : {}),
  storage: new LibSQLStore({ id: "wcp-agent-mastra", url: storageUrl }),
  logger: buildLogger(),
  observability: buildObservability(),
  environment: config.NODE_ENV,
});
