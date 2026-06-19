import { createTool } from "@mastra/core/tools";
import { DeterministicReportSchema, ExtractedWCPSchema } from "../schemas.js";
import { complianceClient, traceHeaders } from "./http.js";
import type { DeterministicReport } from "../schemas.js";

/**
 * Run the deterministic rule engine over an extracted payroll. This is the source of
 * compliance truth (wage/overtime/fringe/arithmetic checks against DBWD rates). Compliance
 * Core computes it; the LLM only explains it.
 */
export const validateTool = createTool({
  id: "validate-wcp",
  description:
    "Run deterministic Davis-Bacon compliance checks (wage, overtime, fringe, arithmetic) over an extracted payroll and return the authoritative report.",
  inputSchema: ExtractedWCPSchema,
  outputSchema: DeterministicReportSchema,
  execute: async (inputData, { requestContext }) => {
    return complianceClient.post<DeterministicReport>(
      "/internal/validate",
      inputData,
      traceHeaders(requestContext),
    );
  },
});
