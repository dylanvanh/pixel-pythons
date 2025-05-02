import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareCommitTx } from "./commit-tx";
import { InsufficientFundsError } from "@/lib/error/error-types/insufficient-funds-error";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";
import { mempoolClient } from "../../external/mempool-client";
import { generateInscriptionData } from "./generate-inscription-data";

vi.mock("../../external/mempool-client", () => ({
  mempoolClient: {
    getUTXOs: vi.fn(),
  },
}));
vi.mock("./generate-inscription-data", () => ({
  generateInscriptionData: vi.fn(),
}));

vi.mock("@/env", () => ({
  env: {
    MEMPOOL_URL: "mock",
    ORDISCAN_URL: "mock",
    ORDISCAN_API_KEY: "mock",
    ORACLE_PRIVATE_KEY_WIF: "mock",
    ORACLE_COMPRESSED_PUBLIC_KEY: "mock",
    ORACLE_TAPROOT_ADDRESS: "mock",
    SUPABASE_URL: "mock",
    SUPABASE_SERVICE_ROLE_KEY: "mock",
    NEXT_PUBLIC_PARENT_INSCRIPTION_ID: "mock",
  },
}));

describe("prepareCommitTx (integration)", () => {
  const mockUtxos = [
    {
      txid: "a".repeat(64),
      vout: 0,
      value: 100_000,
      status: {
        confirmed: true,
        block_height: 1,
        block_hash: "b".repeat(64),
        block_time: 1234567890,
      },
    },
    {
      txid: "c".repeat(64),
      vout: 1,
      value: 200_000,
      status: {
        confirmed: true,
        block_height: 2,
        block_hash: "d".repeat(64),
        block_time: 1234567891,
      },
    },
  ];
  const mockInscriptionData = {
    taprootRevealScript: new Uint8Array([1, 2, 3]),
    taprootRevealValue: 50_000,
    revealFee: 1000,
    postage: 500,
    controlBlock: new Uint8Array([4, 5, 6]),
    inscriptionScript: new Uint8Array([7, 8, 9]),
    contentType: Buffer.from("image/png"),
    content: Buffer.from("mock"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mempoolClient.getUTXOs).mockResolvedValue(mockUtxos);
    vi.mocked(generateInscriptionData).mockResolvedValue(mockInscriptionData);
    process.env.ORACLE_COMPRESSED_PUBLIC_KEY = "02" + "b".repeat(64);
  });

  it("returns a valid CommitPsbtResult with sufficient funds", async () => {
    const result = await prepareCommitTx(
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // valid bech32 address
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "02".padEnd(66, "0"),
      1,
      { feeRate: 10 },
    );
    expect(result.commitPsbt).toBeTypeOf("string");
    expect(result.commitFee).toBeGreaterThan(0);
    expect(result.taprootRevealScript).toEqual(
      mockInscriptionData.taprootRevealScript,
    );
    expect(result.taprootRevealValue).toBe(
      mockInscriptionData.taprootRevealValue,
    );
    expect(result.revealFee).toBe(mockInscriptionData.revealFee);
    expect(result.postage).toBe(mockInscriptionData.postage);
    expect(result.controlBlock).toEqual(mockInscriptionData.controlBlock);
    expect(result.inscriptionScript).toEqual(
      mockInscriptionData.inscriptionScript,
    );
  });

  it("throws InsufficientFundsError if not enough sats", async () => {
    vi.mocked(mempoolClient.getUTXOs).mockResolvedValue([
      {
        txid: "a".repeat(64),
        vout: 0,
        value: 1000,
        status: {
          confirmed: true,
          block_height: 1,
          block_hash: "b".repeat(64),
          block_time: 1234567890,
        },
      },
    ]);
    await expect(
      prepareCommitTx(
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "02".padEnd(66, "0"),
        1,
      ),
    ).rejects.toThrow(InsufficientFundsError);
  });

  it("throws InvalidParametersError for P2SH address without public key", async () => {
    await expect(
      prepareCommitTx(
        "3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC",
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "02".padEnd(66, "0"),
        1,
      ),
    ).rejects.toThrow(InvalidParametersError);
  });
});
