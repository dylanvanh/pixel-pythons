import { createPublicClient, defineChain, getAddress, http, isAddress, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const network = import.meta.env.VITE_NETWORK || "testnet";
const RPC_TIMEOUT_10_SECONDS_MS = 10_000;
const RPC_RETRY_COUNT = 1;

const networks = {
  testnet: {
    id: 46630,
    name: "Robinhood Testnet",
    rpc: "https://rpc.testnet.chain.robinhood.com",
    explorer: "https://explorer.testnet.chain.robinhood.com",
  },
  mainnet: {
    id: 4663,
    name: "Robinhood Chain",
    rpc: "https://rpc.mainnet.chain.robinhood.com",
    explorer: "https://robinhoodchain.blockscout.com",
  },
  local: { id: 31337, name: "Local test chain", rpc: "http://127.0.0.1:8545", explorer: "" },
  sepolia: {
    id: sepolia.id,
    name: "Ethereum Sepolia",
    rpc: sepolia.rpcUrls.default.http[0],
    explorer: sepolia.blockExplorers.default.url,
  },
};

const selectedNetwork = getNetwork();
export const chain = defineChain({
  id: selectedNetwork.id,
  name: selectedNetwork.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL || selectedNetwork.rpc] } },
  testnet: network !== "mainnet",
  ...(selectedNetwork.explorer
    ? { blockExplorers: { default: { name: "Explorer", url: selectedNetwork.explorer } } }
    : {}),
});
export const explorerUrl = selectedNetwork.explorer;
const configuredAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

if (configuredAddress && (!isAddress(configuredAddress) || /^0x0{40}$/i.test(configuredAddress))) {
  throw new Error("VITE_CONTRACT_ADDRESS must be a nonzero EVM address.");
}

export const contractAddress = configuredAddress ? getAddress(configuredAddress) : undefined;
export const publicClient = createPublicClient({
  chain,
  transport: http(undefined, { timeout: RPC_TIMEOUT_10_SECONDS_MS, retryCount: RPC_RETRY_COUNT }),
});

export const collectionAbi = parseAbi([
  "function maxSupply() view returns (uint32)",
  "function mintPriceWei() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function mintOpen() view returns (bool)",
  "function mint() payable returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "error MintClosed()",
  "error SoldOut()",
  "error IncorrectPayment()",
]);

export async function getCollection() {
  if (!contractAddress) {
    return { status: "unconfigured" as const };
  }

  try {
    if ((await publicClient.getChainId()) !== chain.id) {
      throw new Error("RPC network mismatch");
    }

    const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
    const contract = { address: contractAddress, abi: collectionAbi, blockNumber };
    const [maxSupply, mintPriceWei, totalMinted, mintOpen] = await Promise.all([
      publicClient.readContract({ ...contract, functionName: "maxSupply" }),
      publicClient.readContract({ ...contract, functionName: "mintPriceWei" }),
      publicClient.readContract({ ...contract, functionName: "totalMinted" }),
      publicClient.readContract({ ...contract, functionName: "mintOpen" }),
    ]);

    return {
      status: "ready" as const,
      maxSupply,
      mintPriceWei,
      totalMinted: Number(totalMinted),
      mintOpen,
    };
  } catch {
    return { status: "error" as const };
  }
}

export type Collection = Awaited<ReturnType<typeof getCollection>>;

function getNetwork() {
  if (
    network !== "testnet" &&
    network !== "mainnet" &&
    network !== "local" &&
    network !== "sepolia"
  ) {
    throw new Error("VITE_NETWORK must be testnet, mainnet, local, or sepolia.");
  }

  return networks[network];
}
