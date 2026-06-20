import { ServiceClient } from "@wcp/typescript-client";
import { config } from "../config.js";

export const agentClient = new ServiceClient({
  baseUrl: config.AGENT_URL,
  headers: {
    "X-Service": "gateway",
    ...(config.INTERNAL_SERVICE_TOKEN
      ? { "X-Internal-Token": config.INTERNAL_SERVICE_TOKEN }
      : {}),
  },
});
