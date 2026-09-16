import { BaseError, parseEventLogs, zeroAddress, type Address, type Log } from "viem";
import { collectionAbi } from "./collection";

const UNKNOWN_CHAIN_ERROR_CODE = 4902;

export function getMintedTokenId(
  receipt: { status: "success" | "reverted"; logs: Log[] },
  collectionAddress: Address,
) {
  if (receipt.status !== "success") {
    throw new Error("The transaction reverted. No Python was minted.");
  }

  const transferLogs = parseEventLogs({
    abi: collectionAbi,
    eventName: "Transfer",
    logs: receipt.logs,
  });
  const mintLog = transferLogs.find(
    (log) =>
      log.address.toLowerCase() === collectionAddress.toLowerCase() &&
      log.args.from === zeroAddress,
  );

  if (!mintLog) {
    throw new Error("No mint was found in this transaction.");
  }

  return Number(mintLog.args.tokenId);
}

export function isUnknownChainError(cause: unknown): boolean {
  const error = cause instanceof BaseError ? cause.walk(hasUnknownChainCode) : cause;

  return hasUnknownChainCode(error);
}

function hasUnknownChainCode(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNKNOWN_CHAIN_ERROR_CODE
  );
}
