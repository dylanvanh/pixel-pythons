import assert from "node:assert/strict";
import { createWalletClient, http } from "viem";
import { anvil } from "viem/chains";
import {
  chain,
  collectionAbi,
  contractAddress,
  getCollection,
  publicClient,
} from "../src/lib/collection";
import { getMintedTokenId } from "../src/lib/mint";
import { getLocalClient, requireLoopbackUrl } from "./local-chain";

// given
assert.equal(chain.id, anvil.id, "This check only sends transactions on local Anvil.");
const localRpcUrl = chain.rpcUrls.default.http[0];

await getLocalClient(localRpcUrl);
assert.ok(contractAddress, "Run vp run local:setup first.");
const collectionBeforeMint = await getCollection();

assert.equal(collectionBeforeMint.status, "ready");

if (collectionBeforeMint.status !== "ready") {
  throw new Error("Local collection is unavailable.");
}
const walletClient = createWalletClient({ chain, transport: http(localRpcUrl) });
const [, collector] = await walletClient.getAddresses();

assert.ok(collector, "No local test collector found.");

// when
const { request } = await publicClient.simulateContract({
  address: contractAddress,
  abi: collectionAbi,
  functionName: "mint",
  account: collector,
  value: collectionBeforeMint.mintPriceWei,
});
const mintTransactionHash = await walletClient.writeContract(request);
const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTransactionHash });
const tokenId = getMintedTokenId(receipt, contractAddress);
const tokenURI = await publicClient.readContract({
  address: contractAddress,
  abi: collectionAbi,
  functionName: "tokenURI",
  args: [BigInt(tokenId)],
});
const localAppUrl = requireLoopbackUrl(tokenURI).origin;
const metadataResponse = await fetch(tokenURI);
const metadata = await metadataResponse.json();

requireLoopbackUrl(metadata.image);

const imageResponse = await fetch(metadata.image);
const collectionAfterMint = await getCollection();

// then
const EXPECTED_HTTP_OK = 200;
const EXPECTED_HTTP_BAD_REQUEST = 400;
const EXPECTED_MINIMUM_TRAIT_COUNT = 5;

assert.equal(tokenId, collectionBeforeMint.totalMinted + 1);
assert.equal(collectionAfterMint.status, "ready");

if (collectionAfterMint.status === "ready") {
  assert.equal(collectionAfterMint.totalMinted, tokenId);
}

assert.equal(
  await publicClient.readContract({
    address: contractAddress,
    abi: collectionAbi,
    functionName: "ownerOf",
    args: [BigInt(tokenId)],
  }),
  collector,
);
assert.equal(metadataResponse.status, EXPECTED_HTTP_OK);
assert.equal(metadata.name, `Pixel Python #${tokenId}`);
assert.ok(metadata.attributes.length >= EXPECTED_MINIMUM_TRAIT_COUNT);
assert.equal(imageResponse.status, EXPECTED_HTTP_OK);
assert.ok(imageResponse.headers.get("content-type")?.includes("image/svg+xml"));
assert.ok((await imageResponse.text()).includes("data:image/png;base64,"));
assert.equal((await fetch(`${localAppUrl}/api/metadata/0`)).status, EXPECTED_HTTP_BAD_REQUEST);
assert.equal((await fetch(`${localAppUrl}/api/art/01`)).status, EXPECTED_HTTP_BAD_REQUEST);

console.log(
  `Local mint passed: Python #${tokenId}, owner, count, metadata, artwork, and invalid-input checks.\nTransaction: ${mintTransactionHash}`,
);
