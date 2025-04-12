import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { calculateExpectedTxId } from "../core/inscription-utils";
import { mempoolClient } from "../../external/mempool-client";
import { DUST_LIMIT } from "../../constants";

/**
 * Interface for reveal transaction preparation result
 */
export type RevealPsbtResult = {
  revealPsbt: string;
  revealFee: number;
  expectedInscriptionId: string;
  inputSigningMap: { index: number; address: string }[];
};

/**
 * Prepares the reveal transaction for an inscription
 * Takes the actual transaction ID of the broadcasted commit transaction
 */
export async function prepareRevealTx(
  commitTxid: string,
  userOrdinalsAddress: string,
  userPaymentAddress: string,
  revealParams: {
    taprootRevealScript: Uint8Array;
    taprootRevealValue: number;
    controlBlock: Uint8Array;
    inscriptionScript: Uint8Array;
    postage: number;
    revealFee: number;
    paymentPublicKey?: string;
  },
): Promise<RevealPsbtResult> {
  const revealPsbt = new bitcoin.Psbt();

  // Track which inputs need to be signed with which address
  const inputSigningMap: { index: number; address: string }[] = [];

  // Add input from commit transaction (to be signed with ordinals key)
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

  // Record that this input should be signed with the ordinals address
  inputSigningMap.push({ index: 0, address: userOrdinalsAddress });

  const paymentUtxos = await mempoolClient.getUTXOs(userPaymentAddress);

  if (paymentUtxos.length === 0) {
    throw new Error("No UTXOs found in payment wallet to cover fees");
  }

  const estimatedFee = revealParams.revealFee;

  // Find a suitable UTXO from payment wallet
  const selectedUtxo = paymentUtxos.find((utxo) => utxo.value >= estimatedFee);

  if (!selectedUtxo) {
    throw new Error(
      `No suitable UTXO found to cover the fee of ${estimatedFee} sats`,
    );
  }

  if (userPaymentAddress.startsWith("3")) {
    // This is a P2SH address (likely P2SH-P2WPKH)
    if (!revealParams.paymentPublicKey) {
      throw new Error("Payment public key is required for P2SH addresses");
    }

    const publicKeyBuffer = Buffer.from(revealParams.paymentPublicKey, "hex");

    // Create a P2WPKH payment object (for nested SegWit in P2SH)
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKeyBuffer });

    revealPsbt.addInput({
      hash: selectedUtxo.txid,
      index: selectedUtxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(userPaymentAddress),
        value: BigInt(Math.floor(selectedUtxo.value)),
      },
      redeemScript: p2wpkh.output,
    });
  } else {
    // Standard input for non-P2SH addresses
    revealPsbt.addInput({
      hash: selectedUtxo.txid,
      index: selectedUtxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(userPaymentAddress),
        value: BigInt(Math.floor(selectedUtxo.value)),
      },
    });
  }

  inputSigningMap.push({ index: 1, address: userPaymentAddress });

  revealPsbt.addOutput({
    address: userOrdinalsAddress,
    value: BigInt(DUST_LIMIT), // Always use DUST_LIMIT for the ordinal output
  });

  const inputAmount = revealParams.taprootRevealValue + selectedUtxo.value;
  const outputAmount = DUST_LIMIT;

  const estimatedSize = 200; //#TODO:Improve this later
  const feeRate =
    revealParams.revealFee > 0
      ? Math.ceil(revealParams.revealFee / estimatedSize)
      : 1;
  const estimatedFeeForTx = Math.ceil(estimatedSize * feeRate);

  const changeAmount = inputAmount - outputAmount - estimatedFeeForTx;

  if (changeAmount > DUST_LIMIT) {
    revealPsbt.addOutput({
      address: userPaymentAddress,
      value: BigInt(changeAmount),
    });
  }

  const actualFee =
    inputAmount - outputAmount - (changeAmount > DUST_LIMIT ? changeAmount : 0);

  const expectedTxid = calculateExpectedTxId(revealPsbt);

  return {
    revealPsbt: revealPsbt.toBase64(),
    revealFee: actualFee,
    expectedInscriptionId: `${expectedTxid}_0`,
    inputSigningMap,
  };
}
