import { createPublicClient, http } from "viem";
import { anvil } from "viem/chains";

const LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost", "[::1]"];
const LOCAL_RPC_TIMEOUT_5_SECONDS_MS = 5000;
const LOCAL_RPC_RETRY_COUNT = 0;

export function requireLoopbackUrl(value: string): URL {
  const url = new URL(value);

  if (
    url.protocol !== "http:" ||
    !LOOPBACK_HOSTNAMES.includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error("Local tests require an HTTP loopback URL.");
  }

  return url;
}

export async function getLocalClient(rpcUrl: string) {
  requireLoopbackUrl(rpcUrl);

  const client = createPublicClient({
    transport: http(rpcUrl, {
      timeout: LOCAL_RPC_TIMEOUT_5_SECONDS_MS,
      retryCount: LOCAL_RPC_RETRY_COUNT,
    }),
  });

  if ((await client.getChainId()) !== anvil.id) {
    throw new Error("Local tests require Anvil with chain ID 31337.");
  }

  const clientVersion = await client.request({ method: "web3_clientVersion" });

  if (!clientVersion.toLowerCase().includes("anvil")) {
    throw new Error("Local tests require Anvil with chain ID 31337.");
  }

  return client;
}
