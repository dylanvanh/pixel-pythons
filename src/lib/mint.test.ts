import { BaseError, pad, toEventSelector, zeroAddress, type Address, type Log } from "viem";
import { expect, test } from "vite-plus/test";
import { getMintedTokenId, isUnknownChainError } from "./mint";

const COLLECTION_ADDRESS = "0x1111111111111111111111111111111111111111";
const COLLECTOR_ADDRESS = "0x2222222222222222222222222222222222222222";
const FIRST_TOKEN_ID_HEX = "0x01";

test("a successful mint from this collection returns its token ID", () => {
  // given
  const mintLog = createTransferLog(COLLECTION_ADDRESS, zeroAddress);

  // when
  const tokenId = getMintedTokenId({ status: "success", logs: [mintLog] }, COLLECTION_ADDRESS);

  // then
  const EXPECTED_TOKEN_ID = 1;

  expect(tokenId).toBe(EXPECTED_TOKEN_ID);
});

test("a reverted transaction cannot be shown as a confirmed mint", () => {
  // given
  const mintLog = createTransferLog(COLLECTION_ADDRESS, zeroAddress);

  // when
  const readMintedToken = () =>
    getMintedTokenId({ status: "reverted", logs: [mintLog] }, COLLECTION_ADDRESS);

  // then
  expect(readMintedToken).toThrow("reverted");
});

test.each([
  {
    description: "another collection's mint",
    logs: [createTransferLog(COLLECTOR_ADDRESS, zeroAddress)],
  },
  {
    description: "an ordinary transfer",
    logs: [createTransferLog(COLLECTION_ADDRESS, COLLECTOR_ADDRESS)],
  },
  { description: "a transaction without transfers", logs: [] },
])("rejects $description as proof of minting", ({ logs }) => {
  // given
  const receipt = { status: "success" as const, logs };

  // when
  const readMintedToken = () => getMintedTokenId(receipt, COLLECTION_ADDRESS);

  // then
  expect(readMintedToken).toThrow("No mint");
});

test("only an unknown network error starts the add-network request", () => {
  // given
  const unknownNetworkErrorCode = 4902;
  const rejectedRequestErrorCode = 4001;
  const unknownNetworkError = Object.assign(new Error("Unknown network"), {
    code: unknownNetworkErrorCode,
  });
  const rejectedRequestError = Object.assign(new Error("Rejected"), {
    code: rejectedRequestErrorCode,
  });
  const errors = [
    unknownNetworkError,
    new BaseError("Wrapped", { cause: unknownNetworkError }),
    rejectedRequestError,
    new BaseError("Wrapped", { cause: rejectedRequestError }),
    null,
  ];

  // when
  const results = errors.map(isUnknownChainError);

  // then
  const EXPECTED_RESULTS = [true, true, false, false, false];

  expect(results).toEqual(EXPECTED_RESULTS);
});

function createTransferLog(collectionAddress: Address, senderAddress: Address): Log {
  return {
    address: collectionAddress,
    topics: [
      toEventSelector("Transfer(address,address,uint256)"),
      pad(senderAddress),
      pad(COLLECTOR_ADDRESS),
      pad(FIRST_TOKEN_ID_HEX),
    ],
    data: "0x",
    blockHash: null,
    blockNumber: null,
    transactionHash: null,
    transactionIndex: null,
    logIndex: null,
    removed: false,
  };
}
