import { expect, test, vi } from "vite-plus/test";
import { generateInscriptionData } from "./generate-inscription-data";
import { PrepareRevealRequestSchema } from "../../zod-types/reveal-types";

vi.mock("@/features/bitcoin/server/env.server", () => ({
  getBitcoinEnv: () => ({ NEXT_PUBLIC_PARENT_INSCRIPTION_ID: `${"ab".repeat(32)}i0` }),
}));

test("commit and reveal use identical PNG bytes and Taproot scripts", async () => {
  // given
  const ordinalsAddress = "bc1p-test";
  const sessionId = "png2_0123456789abcdef0123456789abcdef";
  const ordinalsPublicKey = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
  const feeRateSatsPerVbyte = 1;

  // when
  const commitData = await generateInscriptionData(
    ordinalsAddress,
    sessionId,
    ordinalsPublicKey,
    feeRateSatsPerVbyte,
  );
  const revealData = await generateInscriptionData(
    ordinalsAddress,
    sessionId,
    ordinalsPublicKey,
    feeRateSatsPerVbyte,
  );

  // then
  for (const field of [
    "content",
    "inscriptionScript",
    "taprootRevealScript",
    "controlBlock",
  ] as const) {
    expect(commitData[field]).toEqual(revealData[field]);
    expect(commitData[field].length).toBeGreaterThan(0);
  }
});

test("reveal rejects sessions from the previous PNG encoder", () => {
  // given
  const request = {
    commitTxid: "ab".repeat(32),
    ordinalsAddress: "address",
    ordinalsPublicKey: "key",
    paymentAddress: "address",
    paymentPublicKey: "key",
    sessionId: "png2_0123456789abcdef0123456789abcdef",
  };
  const previousSessionId = "0123456789abcdef0123456789abcdef";

  // when
  const currentRequest = PrepareRevealRequestSchema.safeParse(request);
  const previousRequest = PrepareRevealRequestSchema.safeParse({
    ...request,
    sessionId: previousSessionId,
  });

  // then
  expect(currentRequest.success).toBe(true);
  expect(previousRequest.success).toBe(false);
});
