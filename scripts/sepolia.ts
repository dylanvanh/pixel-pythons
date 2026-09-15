import { execFileSync } from "node:child_process";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const action = process.argv[2];
const COMMAND_ARGUMENT_COUNT = 3;
const RPC_TIMEOUT_15_SECONDS_MS = 15_000;
const RPC_RETRY_COUNT = 1;
const SIMULATION_SUPPLY = 100;
const SIMULATION_MINT_PRICE_WEI = 1_000_000_000_000_000n;
const SIMULATION_METADATA_BASE_URI = "https://example.com/api/metadata/";

if (
  process.argv.length !== COMMAND_ARGUMENT_COUNT ||
  !["check", "test", "simulate"].includes(action)
) {
  throw new Error("Use check, test, or simulate. This command does not broadcast transactions.");
}

const rpcUrl = process.env.SEPOLIA_RPC_URL || sepolia.rpcUrls.default.http[0];
const client = createPublicClient({
  transport: http(rpcUrl, { timeout: RPC_TIMEOUT_15_SECONDS_MS, retryCount: RPC_RETRY_COUNT }),
});

if ((await client.getChainId()) !== sepolia.id) {
  throw new Error("The RPC must be Ethereum Sepolia.");
}

const blockNumber = await client.getBlockNumber({ cacheTime: 0 });

console.log(
  `Ethereum Sepolia verified: chain ${sepolia.id}, block ${blockNumber}. No public transactions will be sent.`,
);

const commandOptions = {
  env: { ...process.env, SEPOLIA_RPC_URL: rpcUrl },
  stdio: "inherit" as const,
};

if (action === "test") {
  execFileSync(
    "forge",
    ["test", "--fork-url", "sepolia", "--fork-block-number", String(blockNumber)],
    commandOptions,
  );
}

if (action === "simulate") {
  // This is Foundry's public simulation account, not a wallet used for funds.
  const simulationOwner = "0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38";
  execFileSync(
    "forge",
    [
      "script",
      "contracts/script/DeployPixelPythons.s.sol:DeployPixelPythons",
      "--rpc-url",
      "sepolia",
      "--fork-block-number",
      String(blockNumber),
      "--sig",
      "run(address,uint32,uint256,string)",
      simulationOwner,
      String(SIMULATION_SUPPLY),
      String(SIMULATION_MINT_PRICE_WEI),
      SIMULATION_METADATA_BASE_URI,
    ],
    commandOptions,
  );
}
