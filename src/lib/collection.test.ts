import { afterEach, expect, test, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([
  ["local", 31337, ""],
  ["testnet", 46630, "https://explorer.testnet.chain.robinhood.com"],
  ["sepolia", 11155111, "https://sepolia.etherscan.io"],
  ["mainnet", 4663, "https://robinhoodchain.blockscout.com"],
])("%s selects the correct wallet network and explorer", async (network, id, explorer) => {
  // given
  vi.stubEnv("VITE_NETWORK", String(network));
  vi.stubEnv("VITE_CONTRACT_ADDRESS", "");
  vi.stubEnv("VITE_RPC_URL", "");
  vi.resetModules();

  // when
  const { chain, explorerUrl, getCollection } = await import("./collection");

  // then
  expect(chain.id).toBe(id);
  expect(chain.testnet).toBe(network !== "mainnet");
  expect(explorerUrl).toBe(explorer);
  expect(chain.blockExplorers?.default.url || "").toBe(explorer);
  expect(await getCollection()).toEqual({ status: "unconfigured" });
});

test("Sepolia accepts an explicit RPC without changing its chain ID", async () => {
  // given
  vi.stubEnv("VITE_NETWORK", "sepolia");
  vi.stubEnv("VITE_CONTRACT_ADDRESS", "");
  vi.stubEnv("VITE_RPC_URL", "https://rpc.example.com/sepolia");
  vi.resetModules();

  // when
  const { chain } = await import("./collection");

  // then
  expect(chain.id).toBe(11155111);
  expect(chain.rpcUrls.default.http).toEqual(["https://rpc.example.com/sepolia"]);
});

test("an unknown network is rejected", async () => {
  // given
  vi.stubEnv("VITE_NETWORK", "sepola");
  vi.resetModules();

  // when
  const invalidNetwork = import("./collection");

  // then
  await expect(invalidNetwork).rejects.toThrow("VITE_NETWORK");
});

test("a zero contract address is rejected", async () => {
  // given
  vi.stubEnv("VITE_NETWORK", "sepolia");
  vi.stubEnv("VITE_CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000");
  vi.resetModules();

  // when
  const invalidCollection = import("./collection");

  // then
  await expect(invalidCollection).rejects.toThrow("nonzero EVM address");
});
