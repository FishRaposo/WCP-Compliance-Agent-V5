/**
 * `@wcp/contracts` — the single source of truth for cross-service data shapes and the public
 * Gateway API contract. TypeScript services import the Zod schemas + inferred types from here;
 * the OpenAPI document and (in CI) the Python Pydantic models are generated from the same source.
 */
export * from "./schemas.js";
export * from "./contract.js";
