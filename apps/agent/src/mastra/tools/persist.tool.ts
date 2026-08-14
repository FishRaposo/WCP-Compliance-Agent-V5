import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { TrustScoredDecisionSchema } from "../schemas.js";
import { persistDecision } from "./http.js";

/**
 * Persist a trust-scored decision via the Data Platform.
 *
 * CRITICAL boundary: the agent never writes to the database. It hands the decision to the
 * Data Platform, which is the only service that creates the official DecisionRecord +
 * AuditEvent atomically.
 */
export const persistTool = createTool({
  id: "persist-decision",
  description:
    "Hand a completed trust-scored compliance decision to the Data Platform for official, audited persistence.",
  inputSchema: TrustScoredDecisionSchema,
  outputSchema: z.object({ id: z.string() }),
  execute: async (inputData, { requestContext }) => {
    return persistDecision(inputData, requestContext);
  },
});
