import {
  mockAnalyticsOverview,
  mockDecisionSummaries,
  mockTrustScoredDecision,
  mockDecisionVolume,
  mockApprovalRate,
  mockTrustBandDistribution,
  mockCostAnalytics,
  mockJobStatus,
  mockPromptVersions,
  mockContracts,
  mockIngestionJobs,
  mockPayrolls,
  mockComplianceAnalytics,
  mockWagesAnalytics,
  mockLLMAnalytics,
} from "./mock-data";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const IS_MOCK = import.meta.env.VITE_MOCK_API === "true";

async function request<T>(path: string, init?: RequestInit, params?: Record<string, string | number | undefined>): Promise<T> {
  if (IS_MOCK) {
    return mockResolve<T>(path, (init?.method ?? "GET").toUpperCase());
  }

  let url = path;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.append(key, String(value));
    }
    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  }

  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Token is stored in httpOnly cookie by the server - no need to read from localStorage
  // Browser automatically sends cookies with same-origin requests

  if (init?.headers) {
    Object.assign(headers, init.headers as Record<string, string>);
  }

  const fullUrl = BASE_URL ? `${BASE_URL}${url}` : url;
  const res = await fetch(fullUrl, {
    ...init,
    credentials: "include", // Ensure cookies are sent with cross-origin requests too
    headers,
  });

  if (res.status === 401) {
    // Clear any legacy localStorage data (harmless if not present)
    localStorage.removeItem("wcp_token");
    localStorage.removeItem("wcp_user");
    window.dispatchEvent(new CustomEvent("auth:expired"));
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

function normalizeMockPath(path: string): string {
  return path.replace(/^\/api\/v1\//, "/api/");
}

async function mockResolve<T>(path: string, method = "GET"): Promise<T> {
  await new Promise((r) => setTimeout(r, 300));

  const p = normalizeMockPath(path);

  // Mutations: synthesize create/update responses so mock mode exercises the
  // real UI flows (registration, override, batch) without a backend.
  if (method === "POST" || method === "PATCH") {
    if (p.startsWith("/api/contracts")) {
      return {
        id: `mock-${Date.now()}`,
        contract_number: "MOCK-CONTRACT",
        project_name: "Mock Project",
        contractor_name: "Mock Contractor",
        locality: "Washington, DC",
        status: "active",
        payroll_record_count: 0,
        decision_count: 0,
        created_at: new Date().toISOString(),
      } as T;
    }
    if (p.includes("/override")) {
      return {
        ...mockTrustScoredDecision,
        review_status: "overridden",
        reviewed_by: "reviewer@wcp.dev",
        reviewed_at: new Date().toISOString(),
      } as T;
    }
    if (p.startsWith("/api/ingestion/upload")) {
      return { job_id: `mock-job-${Date.now()}`, status: "pending" } as T;
    }
    if (p.startsWith("/api/analyze/batch")) {
      return {
        batch_id: `mock-batch-${Date.now()}`,
        total: 1,
        completed: 1,
        failed: 0,
        results: [mockTrustScoredDecision],
        aggregate: {
          approved: 1,
          rejected: 0,
          needs_review: 0,
          avg_trust_score: mockTrustScoredDecision.trust_score,
          total_cost_usd: mockTrustScoredDecision.cost_usd ?? 0,
          total_violations: mockTrustScoredDecision.violation_count,
        },
      } as T;
    }
  }

  if (p.startsWith("/api/analyze")) return mockTrustScoredDecision as T;
  if (/^\/api\/decisions\/(?!stream)[^/]+$/.test(p)) {
    return { ...mockTrustScoredDecision, decision_id: p.split("/").pop(), id: p.split("/").pop() } as T;
  }
  if (p === "/api/decisions") return mockDecisionSummaries as T;
  if (p.startsWith("/api/jobs/")) return mockJobStatus as T;
  if (p.includes("/analytics/overview")) return mockAnalyticsOverview as T;
  if (p.includes("/analytics/volume") || p.includes("/analytics/decision-volume")) return mockDecisionVolume as T;
  if (p.includes("/analytics/approval")) return mockApprovalRate as T;
  if (p.includes("/analytics/trust-band")) return mockTrustBandDistribution as T;
  if (p.includes("/analytics/cost")) return mockCostAnalytics as T;
  if (p.includes("/prompt-versions")) return mockPromptVersions as T;
  if (p.startsWith("/api/contracts")) return mockContracts as T;
  if (p.startsWith("/api/payrolls")) return mockPayrolls as T;
  if (p.startsWith("/api/ingestion/jobs")) return mockIngestionJobs as T;
  if (p.includes("/analytics/compliance")) return mockComplianceAnalytics as T;
  if (p.includes("/analytics/wages")) return mockWagesAnalytics as T;
  if (p.includes("/analytics/llm")) return mockLLMAnalytics as T;
  if (p === "/health")
    return { status: "ok", version: "5.0.0", phase: 5 } as T;
  if (p.startsWith("/api/auth/login"))
    return { token: "mock-jwt-token", user_id: "mock-user", role: "admin" } as T;

  console.warn(`[apiClient] No mock fixture for path: ${path}`);
  throw new Error(`Mock API not available for: ${path}`);
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) => request<T>(path, undefined, params),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, {
      method: "POST",
      body: form,
    }),
  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
