import { Buffer } from "buffer";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { prepareCommitTx } from "./commit-tx";
import { ErrorCode } from "@/features/bitcoin/lib/error/codes/error-codes";
import { ordiscanClient } from "../../../external/ordiscan-client";
import { generateInscriptionData } from "../../inscriptions/generate-inscription-data";

// Mock the modules
vi.mock("../../../external/ordiscan-client");
vi.mock("../../inscriptions/generate-inscription-data");

vi.mock("@/features/bitcoin/server/env.server", () => ({
  getBitcoinEnv: () => ({
    ORDISCAN_URL: "mock",
    ORDISCAN_API_KEY: "mock",
    NEXT_PUBLIC_PARENT_INSCRIPTION_ID: "mock",
  }),
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
    ordiscanClient.getAddressUTXOs = vi.fn().mockResolvedValue(mockOrdiscanUtxos);
    vi.mocked(generateInscriptionData).mockResolvedValue(mockInscriptionData);
  });

  it("returns a valid CommitPsbtResult with sufficient funds", async () => {
    // given
    const paymentAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
    const ordinalsAddress = paymentAddress;
    const ordinalsPublicKey = "02".padEnd(66, "0");
    const sessionId = "1";
    const feeRateSatsPerVbyte = 10;

    // when
    const result = await prepareCommitTx(
      paymentAddress, // valid bech32 address
      ordinalsAddress,
      ordinalsPublicKey,
      sessionId,
      { feeRate: feeRateSatsPerVbyte },
    );

    // then
    expect(result.commitPsbt).toBeTypeOf("string");
  });

  it("rejects a commit when the payment wallet has insufficient sats", async () => {
    // given
    const paymentAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
    const ordinalsPublicKey = "02".padEnd(66, "0");
    const sessionId = "1";
    const availableBalanceSats = 1000;

    ordiscanClient.getAddressUTXOs = vi.fn().mockResolvedValue([
      {
        outpoint: "a".repeat(64) + ":0",
        value: availableBalanceSats,
        runes: [],
        inscriptions: [],
      },
    ]);

    // when
    const commitResult = prepareCommitTx(
      paymentAddress,
      paymentAddress,
      ordinalsPublicKey,
      sessionId,
    );

    // then
    await expect(commitResult).rejects.toMatchObject({ code: ErrorCode.INSUFFICIENT_FUNDS });
  });

  it("rejects a P2SH payment address without its public key", async () => {
    // given
    const paymentAddress = "3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC";
    const ordinalsAddress = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
    const ordinalsPublicKey = "02".padEnd(66, "0");
    const sessionId = "1";

    // when
    const commitResult = prepareCommitTx(
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      sessionId,
    );

    // then
    await expect(commitResult).rejects.toMatchObject({ code: ErrorCode.INVALID_PARAMETERS });
  });
});
