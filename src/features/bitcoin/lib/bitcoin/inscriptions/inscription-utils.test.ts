import { Buffer } from "buffer";
import { expect, test, vi } from "vite-plus/test";
import { bitcoin } from "../core/bitcoin-config";
import {
  createInscriptionScript,
  estimateCommitFeeInSats,
  estimateRevealFeeInSats,
} from "./inscription-utils";

const environment = vi.hoisted(() => ({ NEXT_PUBLIC_PARENT_INSCRIPTION_ID: "" }));

vi.mock("@/features/bitcoin/server/env.server", () => ({
  getBitcoinEnv: () => environment,
}));

test.each([
  { inscriptionIndex: 0, encodedIndexHex: "" },
  { inscriptionIndex: 1, encodedIndexHex: "01" },
  { inscriptionIndex: 256, encodedIndexHex: "0001" },
  { inscriptionIndex: 4294967295, encodedIndexHex: "ffffffff" },
])(
  "encodes parent inscription index $inscriptionIndex in little-endian bytes",
  ({ inscriptionIndex, encodedIndexHex }) => {
    // given
    const transactionIdHex = "0123456789abcdef".repeat(4);
    const publicKeyLengthBytes = 32;
    const publicKey = Buffer.alloc(publicKeyLengthBytes, 1);
    const contentType = Buffer.from("image/png");
    const content = Buffer.from("pixel-data");
    environment.NEXT_PUBLIC_PARENT_INSCRIPTION_ID = `${transactionIdHex}i${inscriptionIndex}`;

    // when
    const script = createInscriptionScript(publicKey, contentType, content);
    const scriptElements = bitcoin.script.decompile(script);

    // then
    const EXPECTED_PARENT_BYTES = Buffer.concat([
      Buffer.from(transactionIdHex, "hex").reverse(),
      Buffer.from(encodedIndexHex, "hex"),
    ]);

    expect(scriptElements).not.toBeNull();
    expect(scriptElements).toContain(bitcoin.opcodes.OP_3);
    expect(
      scriptElements?.some(
        (element) =>
          element instanceof Uint8Array && Buffer.from(element).equals(EXPECTED_PARENT_BYTES),
      ),
    ).toBe(true);
  },
);

test("commit fee estimation counts each input in sats", () => {
  // given
  const inputCount = 2;
  const feeRateSatsPerVbyte = 2;

  // when
  const feeSats = estimateCommitFeeInSats(inputCount, feeRateSatsPerVbyte);

  // then
  const EXPECTED_FEE_SATS = 440;

  expect(feeSats).toBe(EXPECTED_FEE_SATS);
});

test("reveal fee estimation rounds fractional witness costs up to a whole sat", () => {
  // given
  const contentSizeBytes = 1;
  const feeRateSatsPerVbyte = 1.5;

  // when
  const feeSats = estimateRevealFeeInSats(contentSizeBytes, feeRateSatsPerVbyte);

  // then
  const EXPECTED_FEE_SATS = 250;

  expect(feeSats).toBe(EXPECTED_FEE_SATS);
});
