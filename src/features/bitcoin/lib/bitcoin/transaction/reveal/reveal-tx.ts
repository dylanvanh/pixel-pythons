import { Buffer } from "buffer";
import ECPairFactory from "ecpair";
import { bitcoin } from "@/features/bitcoin/lib/bitcoin/core/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { DUST_LIMIT } from "../../../constants";
import { mempoolClient, UTXO } from "../../../external/mempool-client";
import { AppError } from "@/features/bitcoin/lib/error/error-types/app-error";
import { ErrorCode } from "@/features/bitcoin/lib/error/codes/error-codes";
import { getAvailablePaymentUtxos } from "../../utxo/utxo-fetcher";
import { getBitcoinEnv } from "@/features/bitcoin/server/env.server";

export type RevealPsbtResult = {
  revealPsbt: string;
  inputSigningMap: { index: number; address: string }[];
};

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
  let totalInputValueSats = 0;
  let inputIndex = 1; // Parent index is 0 (oracle signed)

  const compressedPubkey = Buffer.from(getBitcoinEnv().ORACLE_COMPRESSED_PUBLIC_KEY, "hex");

  const xOnlyPubkey = secp256k1.xOnlyPointFromPoint(compressedPubkey);

  const { parentTxId, parentVout } = await getCurrentParentInscriptionUtxoDetails();

  // Add Parent Input (Provenance)
  const parentTx = await mempoolClient.getTransaction(parentTxId);

  if (!parentTx || !parentTx.vout || parentTx.vout.length <= parentVout) {
    throw new Error(
      `Could not fetch or find output ${parentVout} for parent transaction ${parentTxId}`,
    );
  }
  const parentScriptPubKeyHex = parentTx.vout[parentVout].scriptpubkey;

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

  totalInputValueSats += revealParams.taprootRevealValue;

  inputIndex++;

  const paymentUtxos = await getAvailablePaymentUtxos(commitTxid, userPaymentAddress);

  // Calculate required fee contribution AFTER adding inscription output value
  const requiredFeeContributionSats = revealParams.revealFee;

  let accumulatedPaymentValueSats = 0;
  const selectedUtxos = [];

  for (const utxo of paymentUtxos) {
    if (utxo.value <= DUST_LIMIT) {
      continue;
    }

    selectedUtxos.push(utxo);
    accumulatedPaymentValueSats += utxo.value;

    if (accumulatedPaymentValueSats >= requiredFeeContributionSats) {
      break;
    }
  }

  if (accumulatedPaymentValueSats < requiredFeeContributionSats) {
    throw new AppError(
      `Insufficient funds to cover reveal fee. Required: ${requiredFeeContributionSats} sats, Available: ${accumulatedPaymentValueSats} sats`,
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
    const paymentInputValueSats = Math.floor(selectedUtxo.value);

    revealPsbt.addInput({
      hash: selectedUtxo.txid,
      index: selectedUtxo.vout,
      witnessUtxo: {
        script: paymentScript,
        value: BigInt(paymentInputValueSats),
      },
      ...(redeemScript && { redeemScript }),
    });
    inputSigningMap.push({
      index: paymentInputIndex,
      address: userPaymentAddress,
    });

    totalInputValueSats += paymentInputValueSats;
    inputIndex++;
  }

  let totalOutputValueSats = 0;

  // Output 0: Send parent ordinal back to its owner -> send back to oracle
  // Note: The actual sat carrying the parent inscription will flow here.
  revealPsbt.addOutput({
    address: getBitcoinEnv().ORACLE_TAPROOT_ADDRESS, // Send parent back to its owner
    value: BigInt(DUST_LIMIT), // Send dust value
  });
  totalOutputValueSats += DUST_LIMIT;

  // Output 1: New child inscription -> Send to user
  revealPsbt.addOutput({
    address: userOrdinalsAddress, // Send the new inscription here
    value: BigInt(revealParams.postage),
  });
  totalOutputValueSats += revealParams.postage;

  const changeSats = totalInputValueSats - totalOutputValueSats - revealParams.revealFee;

  if (changeSats > DUST_LIMIT) {
    revealPsbt.addOutput({
      address: userPaymentAddress, // Send change back to payment address
      value: BigInt(changeSats),
    });
    totalOutputValueSats += changeSats;
  }

  const oracleKeyPair = ECPairFactory(secp256k1).fromWIF(getBitcoinEnv().ORACLE_PRIVATE_KEY_WIF);
  const tapTweak = bitcoin.crypto.taggedHash("TapTweak", xOnlyPubkey);
  revealPsbt.signInput(0, oracleKeyPair.tweak(tapTweak));

  return {
    revealPsbt: revealPsbt.toBase64(),
    inputSigningMap,
  };
}

/*
 * There could be a queue of unconfimed utxos that the parent is used in
 * this finds the latest output of the parent inscription in the queue
 */
async function getCurrentParentInscriptionUtxoDetails() {
  const oracleAddress = getBitcoinEnv().ORACLE_TAPROOT_ADDRESS;
  const utxos: UTXO[] = await mempoolClient.getUTXOs(oracleAddress);

  for (const utxo of utxos) {
    if (utxo.value !== DUST_LIMIT) {
      continue;
    }

    try {
      const transaction = await mempoolClient.getTransaction(utxo.txid);
      const hasParentInput = transaction.vin.some(
        (input) =>
          input.prevout &&
          input.prevout.value === DUST_LIMIT &&
          input.prevout.scriptpubkey_type === "v1_p2tr" &&
          input.prevout.scriptpubkey_address === oracleAddress,
      );

      if (hasParentInput) {
        return { parentTxId: utxo.txid, parentVout: utxo.vout };
      }
    } catch (error) {
      console.error(`Error fetching transaction ${utxo.txid}:`, error);
    }
  }

  throw new Error(`Could not find a suitable parent UTXO originating from ${oracleAddress}.`);
}
