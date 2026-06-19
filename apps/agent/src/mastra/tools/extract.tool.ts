import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { ExtractedWCPSchema } from "../schemas.js";
import { complianceClient, traceHeaders } from "./http.js";
import type { ExtractedWCP } from "../schemas.js";

/**
 * Parse raw WH-347 text into a structured payroll record via Compliance Core.
 * Compliance Core owns extraction; it never persists.
 */
export const extractTool = createTool({
  id: "extract-wcp",
  description:
    "Extract structured WH-347 certified payroll data (contractor, project, employees) from raw payroll text.",
  inputSchema: z.object({ text: z.string().min(1) }),
  outputSchema: ExtractedWCPSchema,
  execute: async (inputData, { requestContext }) => {
    return complianceClient.post<ExtractedWCP>(
      "/internal/extract",
      { text: inputData.text },
      traceHeaders(requestContext),
    );
  },
});
