import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createWalletClient, http, parseEther } from "viem";
import { anvil } from "viem/chains";
import { getLocalClient, requireLoopbackUrl } from "./local-chain";

const LOCAL_SUPPLY = 100;
const LOCAL_MINT_PRICE_ETH = "0.001";

await setupLocalCollection();

async function setupLocalCollection() {
  const localRpcUrl = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
  const localAppUrl = requireLoopbackUrl(
    process.env.LOCAL_APP_URL || "http://localhost:3010",
  ).origin;
  const environmentFile = process.env.LOCAL_ENV_FILE || ".env.development.local";
  const localMintPriceWei = parseEther(LOCAL_MINT_PRICE_ETH);
  const localMetadataBaseUri = `${localAppUrl}/api/metadata/`;

  if (existsSync(environmentFile)) {
    throw new Error(
      `${environmentFile} already exists. Move it aside before creating a new local collection.`,
    );
  }

  const publicClient = await getLocalClient(localRpcUrl);

  execFileSync("forge", ["build", "--skip", "test", "--no-lint"], { stdio: "inherit" });

  const contractArtifact = JSON.parse(
    readFileSync("out/PixelPythons.sol/PixelPythons.json", "utf8"),
  );
  const walletClient = createWalletClient({ chain: anvil, transport: http(localRpcUrl) });
  const [ownerAddress] = await walletClient.getAddresses();

  if (!ownerAddress) {
    throw new Error("Anvil did not return a local test account.");
  }

  const deploymentHash = await walletClient.deployContract({
    account: ownerAddress,
    abi: contractArtifact.abi,
    bytecode: contractArtifact.bytecode.object,
    args: [ownerAddress, LOCAL_SUPPLY, localMintPriceWei, localMetadataBaseUri],
  });
  const deploymentReceipt = await publicClient.waitForTransactionReceipt({ hash: deploymentHash });

  if (deploymentReceipt.status !== "success" || !deploymentReceipt.contractAddress) {
    throw new Error("Local contract creation failed.");
  }

  const openMintHash = await walletClient.writeContract({
    address: deploymentReceipt.contractAddress,
    account: ownerAddress,
    abi: contractArtifact.abi,
    functionName: "setMintOpen",
    args: [true],
  });
  const openMintReceipt = await publicClient.waitForTransactionReceipt({ hash: openMintHash });

  if (openMintReceipt.status !== "success") {
    throw new Error("Could not open local minting.");
  }

  const environmentContent = [
    "VITE_NETWORK=local",
    `VITE_CONTRACT_ADDRESS=${deploymentReceipt.contractAddress}`,
    `VITE_RPC_URL=${localRpcUrl}`,
    "",
  ].join("\n");

  writeFileSync(environmentFile, environmentContent, { flag: "wx" });

  console.log(
    `Local collection: ${deploymentReceipt.contractAddress}\n` +
      `Test supply: ${LOCAL_SUPPLY}; test price: ${LOCAL_MINT_PRICE_ETH} ETH.\n` +
      "Run vp run dev. No public chain was changed.",
  );
}
