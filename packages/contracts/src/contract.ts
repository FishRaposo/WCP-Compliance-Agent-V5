import { initContract } from "@ts-rest/core";
import { z } from "zod";
import * as S from "./schemas.js";

const c = initContract();

/**
 * The typed contract for the public Gateway HTTP API (`/api/v1/*`). The gateway validates
 * requests against it and the web client infers fully-typed calls from it — one source, no
 * drift. `openapi.ts` emits an OpenAPI document from this contract (for docs + the CI Pydantic
 * generation step).
 */
export const apiContract = c.router(
  {
    analyze: {
      method: "POST",
      path: "/api/v1/analyze",
      body: S.AnalyzeRequest,
      responses: {
        200: S.TrustScoredDecision,
        400: S.ErrorResponse,
        502: S.ErrorResponse,
      },
      summary: "Analyze raw WH-347 payroll text end-to-end and return a trust-scored decision.",
    },

    listDecisions: {
      method: "GET",
      path: "/api/v1/decisions",
      query: z.object({
        limit: z.coerce.number().int().min(1).max(200).optional(),
        offset: z.coerce.number().int().min(0).optional(),
        verdict: S.VerdictStatus.optional(),
        trust_band: S.TrustBand.optional(),
      }),
      responses: {
        200: z.array(S.DecisionSummary),
        502: S.ErrorResponse,
      },
      summary: "List persisted decisions, newest first.",
    },

    getDecision: {
      method: "GET",
      path: "/api/v1/decisions/:id",
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: S.DecisionSummary,
        404: S.ErrorResponse,
        502: S.ErrorResponse,
      },
      summary: "Fetch a single decision by id.",
    },

    reviewDecision: {
      method: "POST",
      path: "/api/v1/decisions/:id/review",
      pathParams: z.object({ id: z.string() }),
      body: S.ReviewRequest,
      responses: {
        200: S.DecisionSummary,
        400: S.ErrorResponse,
        404: S.ErrorResponse,
        502: S.ErrorResponse,
      },
      summary: "Apply a human reviewer's override to a flagged decision.",
    },

    analyticsOverview: {
      method: "GET",
      path: "/api/v1/analytics/overview",
      query: z.object({ days: z.coerce.number().int().min(1).max(365).optional() }),
      responses: {
        200: S.AnalyticsOverview,
        502: S.ErrorResponse,
      },
      summary: "Platform analytics overview.",
    },

    analyticsVolume: {
      method: "GET",
      path: "/api/v1/analytics/volume",
      query: z.object({ days: z.coerce.number().int().min(1).max(365).optional() }),
      responses: {
        200: z.array(S.DecisionVolume),
        502: S.ErrorResponse,
      },
      summary: "Decision volume over time.",
    },
  },
  {
    strictStatusCodes: true,
  },
);

export type ApiContract = typeof apiContract;
