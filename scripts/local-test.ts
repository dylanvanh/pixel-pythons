import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { createServer } from "node:net";
import { anvil } from "viem/chains";

const TEST_RPC_PORT = 8546;
const TEST_APP_PORT = 3005;
const COMMAND_TIMEOUT_2_MINUTES_MS = 120_000;
const STARTUP_TIMEOUT_30_SECONDS_MS = 30_000;
const PAGE_TIMEOUT_30_SECONDS_MS = 30_000;
const READINESS_TIMEOUT_1_SECOND_MS = 1000;
const READINESS_INTERVAL_250_MILLISECONDS_MS = 250;
const SHUTDOWN_TIMEOUT_5_SECONDS_MS = 5000;
const MAX_ERROR_LOG_CHARACTERS = 3000;

const testRpcUrl = `http://127.0.0.1:${TEST_RPC_PORT}`;
const testAppUrl = `http://localhost:${TEST_APP_PORT}`;
const temporaryDirectory = mkdtempSync(join(tmpdir(), "pixel-pythons-test-"));
const environmentFile = join(temporaryDirectory, ".env.test");
const childProcesses: ChildProcess[] = [];
const processLogs: string[] = [];
const testEnvironment = {
  ...process.env,
  LOCAL_RPC_URL: testRpcUrl,
  LOCAL_APP_URL: testAppUrl,
  LOCAL_ENV_FILE: environmentFile,
  WRANGLER_LOG_PATH: join(temporaryDirectory, "wrangler.log"),
};

try {
  await runLocalMintTest();
} finally {
  for (const childProcess of childProcesses.reverse()) {
    await stopProcess(childProcess);
  }

  rmSync(temporaryDirectory, { recursive: true, force: true });
}

async function runLocalMintTest() {
  // given
  for (const command of ["forge", "anvil", "cast"]) {
    execFileSync(command, ["--version"], { stdio: "inherit" });
  }

  await requireFreePort(TEST_RPC_PORT, "127.0.0.1");
  await requireFreePort(TEST_APP_PORT, "localhost");

  const chainProcess = startProcess(
    "anvil",
    [
      "--host",
      "127.0.0.1",
      "--port",
      String(TEST_RPC_PORT),
      "--chain-id",
      String(anvil.id),
      "--silent",
    ],
    testEnvironment,
  );

  await waitUntilReady(chainProcess, testRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
  });

  execFileSync("bun", ["scripts/local-setup.ts"], {
    env: testEnvironment,
    stdio: "inherit",
    timeout: COMMAND_TIMEOUT_2_MINUTES_MS,
  });

  const appEnvironment = {
    ...testEnvironment,
    ...parseEnv(readFileSync(environmentFile, "utf8")),
  };
  const appProcess = startProcess(
    "vp",
    ["dev", "--port", String(TEST_APP_PORT), "--strictPort"],
    appEnvironment,
  );

  await waitUntilReady(appProcess, `${testAppUrl}/api/metadata/1`);

  // when
  execFileSync("bun", ["scripts/local-check.ts"], {
    env: appEnvironment,
    stdio: "inherit",
    timeout: COMMAND_TIMEOUT_2_MINUTES_MS,
  });

  // then
  const EXPECTED_HTTP_STATUS = 200;

  for (const path of ["/", "/collection"]) {
    const response = await fetch(`${testAppUrl}${path}`, {
      signal: AbortSignal.timeout(PAGE_TIMEOUT_30_SECONDS_MS),
    });
    const html = await response.text();

    assert.equal(response.status, EXPECTED_HTTP_STATUS);
    assert.ok(html.includes("Local test chain"));
    assert.ok(html.includes("MINTED"), "Server-rendered pages must include the confirmed mint.");
  }

  console.log("Isolated local test passed. Your existing chain and app settings were not changed.");
}

async function requireFreePort(port: number, host: string) {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();

    server.once("error", () =>
      reject(new Error(`Port ${port} is in use. Stop its process or run this test later.`)),
    );
    server.listen(port, host, () => server.close(() => resolve()));
  });
}

function startProcess(command: string, argumentsList: string[], environment: NodeJS.ProcessEnv) {
  const childProcess = spawn(command, argumentsList, {
    env: environment,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  childProcesses.push(childProcess);
  childProcess.on("error", (error) => processLogs.push(error.message));
  childProcess.stdout?.on("data", (data) => processLogs.push(String(data)));
  childProcess.stderr?.on("data", (data) => processLogs.push(String(data)));

  return childProcess;
}

async function stopProcess(childProcess: ChildProcess) {
  const processId = childProcess.pid;

  if (!processId || childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    const shutdownTimeout = setTimeout(() => {
      process.kill(-processId, "SIGKILL");
    }, SHUTDOWN_TIMEOUT_5_SECONDS_MS);

    childProcess.once("exit", () => {
      clearTimeout(shutdownTimeout);
      resolve();
    });
    process.kill(-processId, "SIGTERM");
  });
}

async function waitUntilReady(childProcess: ChildProcess, url: string, options?: RequestInit) {
  const deadlineMs = Date.now() + STARTUP_TIMEOUT_30_SECONDS_MS;

  while (Date.now() < deadlineMs) {
    if (childProcess.exitCode !== null || childProcess.signalCode !== null || !childProcess.pid) {
      break;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(READINESS_TIMEOUT_1_SECOND_MS),
      });

      if (response.ok) {
        await waitForReadinessInterval();

        if (childProcess.exitCode === null && childProcess.signalCode === null) {
          return;
        }
      }
    } catch {
      /* The process is still starting. */
    }

    await waitForReadinessInterval();
  }

  const recentLogs = processLogs.join("").slice(-MAX_ERROR_LOG_CHARACTERS);

  throw new Error(`Local process did not start. ${recentLogs}`);
}

function waitForReadinessInterval() {
  return new Promise((resolve) => setTimeout(resolve, READINESS_INTERVAL_250_MILLISECONDS_MS));
}
