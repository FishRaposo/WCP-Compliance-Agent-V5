import { generateOpenApi } from "@ts-rest/open-api";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiContract } from "./contract.js";

/**
 * Emit an OpenAPI 3 document from the ts-rest contract. Run via `pnpm --filter @wcp/contracts
 * openapi`. The committed `generated/openapi.json` is the golden file the drift test asserts
 * against, and the input to the CI Pydantic generation step (datamodel-code-generator).
 */
export function buildOpenApi() {
  return generateOpenApi(
    apiContract,
    {
      info: { title: "WCP Compliance Gateway API", version: "5.0.0" },
    },
    { setOperationId: true },
  );
}

function main() {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "openapi.json"), `${JSON.stringify(buildOpenApi(), null, 2)}\n`);
  console.log("Wrote packages/contracts/generated/openapi.json");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
