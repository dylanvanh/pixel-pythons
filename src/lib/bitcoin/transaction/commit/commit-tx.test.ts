import { describe, it, expect, vi, beforeEach } from "vitest";
import { prepareCommitTx } from "./commit-tx";
import { ErrorCode } from "@/lib/error/codes/error-codes";
import { ordiscanClient } from "../../../external/ordiscan-client";
import { generateInscriptionData } from "../../inscriptions/generate-inscription-data";

// Mock the modules
vi.mock("../../../external/ordiscan-client");
vi.mock("../../inscriptions/generate-inscription-data");

vi.mock("@/env", () => ({
  env: {
    ORDISCAN_URL: "mock",
    ORDISCAN_API_KEY: "mock",
    NEXT_PUBLIC_PARENT_INSCRIPTION_ID: "mock",
  },
}));

describe("prepareCommitTx (integration)", () => {
  const mockOrdiscanUtxos = [
    {
      outpoint: "a".repeat(64) + ":0",
      value: 100_000,
      runes: [],
      inscriptions: [],
    },
    {
      outpoint: "c".repeat(64) + ":1",
      value: 200_000,
      runes: [],
      inscriptions: [],
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
    // Set up mocks using vi.mocked
    ordiscanClient.getAddressUTXOs = vi
      .fn()
      .mockResolvedValue(mockOrdiscanUtxos);
    vi.mocked(generateInscriptionData).mockResolvedValue(mockInscriptionData);
  });

  it("returns a valid CommitPsbtResult with sufficient funds", async () => {
    const result = await prepareCommitTx(
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // valid bech32 address
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "02".padEnd(66, "0"),
      "1",
      { feeRate: 10 },
    );
    expect(result.commitPsbt).toBeTypeOf("string");
  });

  it("throws InsufficientFundsError if not enough sats", async () => {
    ordiscanClient.getAddressUTXOs = vi.fn().mockResolvedValue([
      {
        outpoint: "a".repeat(64) + ":0",
        value: 1000,
        runes: [],
        inscriptions: [],
      },
    ]);

    await expect(
      prepareCommitTx(
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "02".padEnd(66, "0"),
        "1",
      ),
    ).rejects.toMatchObject({ code: ErrorCode.INSUFFICIENT_FUNDS });
  });

  it("throws InvalidParametersError for P2SH address without public key", async () => {
    await expect(
      prepareCommitTx(
        "3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC",
        "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "02".padEnd(66, "0"),
        "1",
      ),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAMETERS });
  });
});
