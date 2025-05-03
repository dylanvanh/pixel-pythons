import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import {
  createInscriptionScript,
  estimateRevealFee,
} from "./inscription-utils";
import { generateImageBufferForMint } from "@/lib/image-gen/generate-image";
import { DUST_LIMIT, DEFAULT_FEE_RATE } from "@/lib/constants";

export type InscriptionDataParams = {
  contentType: Buffer;
  content: Buffer;
  inscriptionScript: Uint8Array;
  taprootRevealScript: Uint8Array;
  taprootRevealValue: number;
  controlBlock: Uint8Array;
  revealFee: number;
  postage: number;
};

/**
 * Generates the image buffer and all necessary Taproot inscription parameters.
 */
export async function generateInscriptionData(
  ordinalsAddress: string,
  mintIndex: number,
  ordinalsPublicKey: string,
  feeRateInput?: number,
): Promise<InscriptionDataParams> {
  const feeRate = feeRateInput || DEFAULT_FEE_RATE;
  const postage = DUST_LIMIT;

  const imageBuffer = await generateImageBufferForMint(
    ordinalsAddress,
    mintIndex,
  );
  const contentType = Buffer.from("image/png");
  const content = imageBuffer;

  const userPubKey = Buffer.from(ordinalsPublicKey, "hex");
  let userXOnlyPubkey: Uint8Array;
  if (userPubKey.length === 32) {
    userXOnlyPubkey = Uint8Array.from(userPubKey);
  } else {
    userXOnlyPubkey = secp256k1.xOnlyPointFromPoint(
      Uint8Array.from(userPubKey),
    );
  }

  const inscriptionScript = createInscriptionScript(
    userXOnlyPubkey,
    contentType,
    content,
  );

  const scriptTree = { output: inscriptionScript, version: 0xc0 };

  const taprootPayment = bitcoin.payments.p2tr({
    internalPubkey: userXOnlyPubkey,
    scriptTree,
    redeem: { output: inscriptionScript, redeemVersion: 0xc0 },
  });

  if (!taprootPayment.output || !taprootPayment.witness) {
    throw new Error("Failed to generate taproot payment data");
  }

  const controlBlock =
    taprootPayment.witness[taprootPayment.witness.length - 1];

  const revealFee = estimateRevealFee(content.length, feeRate);

  return {
    contentType,
    content,
    inscriptionScript,
    taprootRevealScript: taprootPayment.output,
    taprootRevealValue: DUST_LIMIT,
    controlBlock,
    revealFee,
    postage,
  };
}
