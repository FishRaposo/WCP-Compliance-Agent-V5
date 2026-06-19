import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { DBWDRateRecordSchema } from "../schemas.js";
import { complianceClient, traceHeaders } from "./http.js";
import type { DBWDRateRecord } from "../schemas.js";

/**
 * Look up the prevailing Davis-Bacon wage determination rate for a trade/locality/date.
 * A precise, single-fact retrieval tool the verdict agent can use to confirm a wage floor.
 */
export const dbwdLookupTool = createTool({
  id: "dbwd-rate-lookup",
  description:
    "Look up the official Davis-Bacon prevailing wage and fringe rate for a specific trade classification, locality, and effective date.",
  inputSchema: z.object({
    trade: z.string().min(1),
    locality: z.string().min(1),
    date: z.string().min(1),
  }),
  outputSchema: DBWDRateRecordSchema,
  execute: async (inputData, { requestContext }) => {
    const { trade, locality, date } = inputData;
    return complianceClient.get<DBWDRateRecord>(
      `/internal/dbwd/${encodeURIComponent(trade)}/${encodeURIComponent(locality)}/${encodeURIComponent(date)}`,
      traceHeaders(requestContext),
    );
  },
});
