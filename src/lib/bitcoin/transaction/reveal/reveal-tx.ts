import { bitcoin, ECPair } from "@/lib/bitcoin/core/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { DUST_LIMIT, getOracleTaprootAddress } from "../../../constants";
import { mempoolClient, UTXO } from "../../../external/mempool-client";
import { AppError } from "@/lib/error/error-types/app-error";
import { ErrorCode } from "@/lib/error/codes/error-codes";
import { getAvailablePaymentUtxos } from "../../utxo/utxo-fetcher";
import { env } from "@/env";

export type RevealPsbtResult = {
  revealPsbt: string;
  inputSigningMap: { index: number; address: string }[];
};

/*
 * There could be a queue of unconfimed utxos that the parent is used in
 * this finds the latest output of the parent inscription in the queue
 */
async function getCurrentParentInscriptionUtxoDetails() {
  const oracleAddress = getOracleTaprootAddress();
  const utxos: UTXO[] = await mempoolClient.getUTXOs(oracleAddress);

  let parentUtxo: UTXO | null = null;

  for (const utxo of utxos) {
    if (utxo.value !== DUST_LIMIT) {
      continue;
    }

    try {
      const txInfo = await mempoolClient.getTransaction(utxo.txid);

      const foundMatchingInput = txInfo.vin.some((input) => {
        if (
          input.prevout &&
          input.prevout.value === DUST_LIMIT &&
          input.prevout.scriptpubkey_type === "v1_p2tr" &&
          input.prevout.scriptpubkey_address === oracleAddress
        ) {
          parentUtxo = utxo;
          return true;
        }
        return false;
      });

      if (foundMatchingInput) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching transaction ${utxo.txid}:`, error);
      continue;
    }
  }

  if (!parentUtxo) {
    throw new Error(
      `Could not find a suitable parent UTXO originating from ${oracleAddress}.`,
    );
  }

  const parentTxId = (parentUtxo as UTXO).txid;
  const parentVout = (parentUtxo as UTXO).vout;

  return { parentTxId, parentVout };
}



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
  const inputSigningMap: { index: number; address: string }[] = [];
  let totalInputValue = 0;
  let inputIndex = 1; // Parent index is 0 (oracle signed)

  const compressedPubkey = Buffer.from(env.ORACLE_COMPRESSED_PUBLIC_KEY, "hex");

  const xOnlyPubkey = secp256k1.xOnlyPointFromPoint(compressedPubkey);

  const { parentTxId, parentVout } =
    await getCurrentParentInscriptionUtxoDetails();

  // Add Parent Input (Provenance)
  let parentScriptPubKeyHex = null;
  const parentTx = await mempoolClient.getTransaction(parentTxId);
  if (!parentTx || !parentTx.vout || parentTx.vout.length <= parentVout) {
    throw new Error(
      `Could not fetch or find output ${parentVout} for parent transaction ${parentTxId}`,
    );
  }
  parentScriptPubKeyHex = parentTx.vout[parentVout].scriptpubkey;
  if (!parentScriptPubKeyHex) {
    throw new Error(
      `Could not find scriptpubkey for output ${parentVout} in transaction ${parentTxId}`,
    );
  }

  // Parent input added as input 0
  revealPsbt.addInput({
    hash: parentTxId,
    index: parentVout,
    witnessUtxo: {
      script: Buffer.from(parentScriptPubKeyHex, "hex"),
      value: BigInt(parentTx.vout[0].value),
    },
    tapInternalKey: xOnlyPubkey,
  });

  // Add Commit Input (Inscription data)
  const commitInputIndex = inputIndex;
  revealPsbt.addInput({
    hash: commitTxid,
    index: 0,
    witnessUtxo: {
      script: revealParams.taprootRevealScript,
      value: BigInt(revealParams.taprootRevealValue),
    },
    tapLeafScript: [
      {
        leafVersion: 0xc0,
        script: new Uint8Array(revealParams.inscriptionScript),
        controlBlock: new Uint8Array(revealParams.controlBlock),
      },
    ],
  });
  inputSigningMap.push({
    index: commitInputIndex,
    address: userOrdinalsAddress,
  });

  totalInputValue += revealParams.taprootRevealValue;

  inputIndex++;

  const paymentUtxos = await getAvailablePaymentUtxos(commitTxid, userPaymentAddress);

  // Calculate required fee contribution AFTER adding inscription output value
  const requiredFeeContribution = revealParams.revealFee;

  let accumulatedPaymentValue = 0;
  const selectedUtxos = [];
  for (const utxo of paymentUtxos) {
    if (utxo.value <= DUST_LIMIT) continue;
    selectedUtxos.push(utxo);
    accumulatedPaymentValue += utxo.value;
    if (accumulatedPaymentValue >= requiredFeeContribution) break;
  }

  if (accumulatedPaymentValue < requiredFeeContribution) {
    throw new AppError(
      `Insufficient funds to cover reveal fee. Required: ${requiredFeeContribution} sats, Available: ${accumulatedPaymentValue} sats`,
      ErrorCode.INSUFFICIENT_FUNDS,
    );
  }

  const paymentScript = bitcoin.address.toOutputScript(userPaymentAddress);
  let redeemScript: Uint8Array | undefined;
  if (userPaymentAddress.startsWith("3")) {
    if (!revealParams.paymentPublicKey) {
      throw new Error("Payment public key is required for P2SH addresses");
    }
    redeemScript = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(revealParams.paymentPublicKey, "hex"),
    }).output;
  }

  for (const selectedUtxo of selectedUtxos) {
    const paymentInputIndex = inputIndex;
    const paymentInputValue = Math.floor(selectedUtxo.value);
    revealPsbt.addInput({
      hash: selectedUtxo.txid,
      index: selectedUtxo.vout,
      witnessUtxo: {
        script: paymentScript,
        value: BigInt(paymentInputValue),
      },
      ...(redeemScript && { redeemScript }),
    });
    inputSigningMap.push({
      index: paymentInputIndex,
      address: userPaymentAddress,
    });

    totalInputValue += paymentInputValue; //
    inputIndex++;
  }

  let totalOutputValue = 0;

  // Output 0: Send parent ordinal back to its owner -> send back to oracle
  // Note: The actual sat carrying the parent inscription will flow here.
  revealPsbt.addOutput({
    address: getOracleTaprootAddress(), // Send parent back to its owner
    value: BigInt(DUST_LIMIT), // Send dust value
  });
  totalOutputValue += DUST_LIMIT;

  // Output 1: New child inscription -> Send to user
  revealPsbt.addOutput({
    address: userOrdinalsAddress, // Send the new inscription here
    value: BigInt(revealParams.postage),
  });
  totalOutputValue += revealParams.postage;

  const changeAmount =
    totalInputValue - totalOutputValue - revealParams.revealFee;

  if (changeAmount > DUST_LIMIT) {
    revealPsbt.addOutput({
      address: userPaymentAddress, // Send change back to payment address
      value: BigInt(changeAmount),
    });
    totalOutputValue += changeAmount;
  }

  const oracleKeyPair = ECPair.fromWIF(env.ORACLE_PRIVATE_KEY_WIF);
  const tapTweak = bitcoin.crypto.taggedHash("TapTweak", xOnlyPubkey);
  revealPsbt.signInput(0, oracleKeyPair.tweak(tapTweak));

  return {
    revealPsbt: revealPsbt.toBase64(),
    inputSigningMap,
  };
}
