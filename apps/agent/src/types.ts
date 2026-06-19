/**
 * Back-compat re-export. The canonical schemas now live in `mastra/schemas.ts` (co-located
 * with the Mastra layer that consumes them). Existing importers of `../types` keep working.
 */
export * from "./mastra/schemas.js";
