import { bitcoin } from "@/lib/bitcoin/bitcoin-config";
import { calculateExpectedTxId } from "./inscription-utils";

/**
 * Interface for reveal transaction preparation result
 */
export type RevealPsbtResult = {
  revealPsbt: string;
  revealFee: number;
  expectedInscriptionId: string;
};

/**
 * Prepares the reveal transaction for an inscription
 * Takes the actual transaction ID of the broadcasted commit transaction
 */
export function prepareRevealTx(
  commitTxid: string, 
  userOrdinalsAddress: string,
  revealParams: {
    taprootRevealScript: Uint8Array;
    taprootRevealValue: number;
    controlBlock: Uint8Array;
    inscriptionScript: Uint8Array;
    postage: number;
  }
): RevealPsbtResult {
  // Create reveal transaction PSBT
  const revealPsbt = new bitcoin.Psbt();

  // Add input from commit transaction
  revealPsbt.addInput({
    hash: commitTxid,
    index: 0, // The first output is the taproot output
    witnessUtxo: {
      script: revealParams.taprootRevealScript,
      value: BigInt(revealParams.taprootRevealValue),
    },
    tapLeafScript: [
      {
        leafVersion: 0xc0,
        script: revealParams.inscriptionScript,
        controlBlock: revealParams.controlBlock,
      },
    ],
  });

  // Add output for the inscription to go to user's ordinals address
  revealPsbt.addOutput({
    address: userOrdinalsAddress,
    value: BigInt(revealParams.postage),
  });

  // Calculate expected reveal txid and inscription ID
  const expectedTxid = calculateExpectedTxId(revealPsbt);

  return {
    revealPsbt: revealPsbt.toBase64(),
    revealFee: revealParams.taprootRevealValue - revealParams.postage, // The fee is the remainder
    expectedInscriptionId: `${expectedTxid}_0`,
  };
} 