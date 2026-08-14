import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type BridgeOperation = "extract" | "validate";
type PythonInvocation = { command: string; args: string[] };

const BRIDGE_TIMEOUT_MS = 4_500;
const complianceCoreRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../compliance-core");
const complianceCoreSource = resolve(complianceCoreRoot, "src");

function pythonInvocations(): PythonInvocation[] {
  const configured = process.env.COMPLIANCE_CORE_PYTHON?.trim();
  if (configured) return [{ command: configured, args: [] }];

  const local = process.platform === "win32"
    ? resolve(complianceCoreRoot, ".venv/Scripts/python.exe")
    : resolve(complianceCoreRoot, ".venv/bin/python");
  const candidates: PythonInvocation[] = existsSync(local)
    ? [{ command: local, args: [] }]
    : [];
  if (process.platform === "win32") {
    candidates.push({ command: "python", args: [] }, { command: "py", args: ["-3"] });
  } else {
    candidates.push({ command: "python3", args: [] }, { command: "python", args: [] });
  }
  return candidates;
}

function runInvocation(
  invocation: PythonInvocation,
  operation: BridgeOperation,
  payload: unknown,
): Promise<unknown> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      invocation.command,
      [...invocation.args, "-m", "wcp_compliance.offline_bridge"],
      {
        cwd: complianceCoreRoot,
        env: {
          ...process.env,
          PYTHONPATH: [complianceCoreSource, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
        },
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(() => rejectPromise(new Error(`Compliance Core bridge exceeded ${BRIDGE_TIMEOUT_MS}ms`)));
    }, BRIDGE_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (error) => finish(() => rejectPromise(error)));
    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          rejectPromise(new Error(`Compliance Core bridge exited ${code}: ${stderr.trim()}`));
          return;
        }
        try {
          resolvePromise(JSON.parse(stdout));
        } catch (error) {
          rejectPromise(new Error("Compliance Core bridge returned invalid JSON", { cause: error }));
        }
      });
    });
    child.stdin.on("error", (error) => finish(() => rejectPromise(error)));
    child.stdin.end(JSON.stringify({ operation, payload }));
  });
}

export async function runComplianceCoreBridge(
  operation: BridgeOperation,
  payload: unknown,
): Promise<unknown> {
  const invocations = pythonInvocations();
  let missingInterpreter: unknown;
  for (const invocation of invocations) {
    try {
      return await runInvocation(invocation, operation, payload);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      missingInterpreter = error;
    }
  }
  throw new Error("No local Python interpreter is available for Compliance Core", {
    cause: missingInterpreter,
  });
}
