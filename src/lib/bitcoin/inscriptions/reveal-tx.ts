import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { DUST_LIMIT, ORACLE_TAPROOT_ADDRESS } from "../../constants";
import { mempoolClient, UTXO } from "../../external/mempool-client";
import { calculateExpectedTxId } from "../core/inscription-utils";
import { signParentP2TRInput } from "../oracle/oracle";
import { InsufficientFundsError } from "@/lib/error/error-types/insufficient-funds-error";

export type RevealPsbtResult = {
  revealPsbt: string;
  revealFee: number;
  expectedInscriptionId: string;
  inputSigningMap: { index: number; address: string }[];
};

/*
 * There could be a queue of unconfimed utxos that the parent is used in
 * this finds the latest output of the parent inscription in the queue
 */
async function getCurrentParentInscriptionUtxoDetails() {
  const utxos: UTXO[] = await mempoolClient.getUTXOs(ORACLE_TAPROOT_ADDRESS);

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
          input.prevout.scriptpubkey_address === ORACLE_TAPROOT_ADDRESS
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
      `Could not find a suitable parent UTXO originating from ${ORACLE_TAPROOT_ADDRESS}.`,
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

  const compressedPubkey = Buffer.from(
    process.env.ORACLE_COMPRESSED_PUBLIC_KEY!,
    "hex",
  );

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
    // Assuming parent is a standard Taproot output, adjust if needed
    witnessUtxo: {
      script: Buffer.from(parentScriptPubKeyHex, "hex"), // Now guaranteed to be a string
      value: BigInt(parentTx.vout[0].value),
    },
    tapInternalKey: xOnlyPubkey,
  });

  // --- 2. Add Commit Input (Inscription data)
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
        script: revealParams.inscriptionScript, // This script MUST include OP_3 if parentParams was used upstream
        controlBlock: revealParams.controlBlock,
      },
    ],
  });
  inputSigningMap.push({
    index: commitInputIndex,
    address: userOrdinalsAddress,
  });

  totalInputValue += revealParams.taprootRevealValue;

  inputIndex++;

  const paymentUtxos = await mempoolClient.getUTXOs(userPaymentAddress);

  if (paymentUtxos.length === 0) {
    throw new Error("No UTXOs found in payment wallet to cover fees");
  }

  // Calculate required fee contribution AFTER adding inscription output value
  // The fee calculation might need refinement depending on how revealFee is estimated
  const requiredFeeContribution = revealParams.revealFee;

  // Filter out dust UTXOs and calculate total available value
  const availablePaymentUtxos = paymentUtxos.filter(
    (utxo) => utxo.value > DUST_LIMIT,
  );
  const totalAvailablePaymentValue = availablePaymentUtxos.reduce(
    (sum, utxo) => sum + utxo.value,
    0,
  );

  if (totalAvailablePaymentValue < requiredFeeContribution) {
    throw new InsufficientFundsError(
      `Insufficient funds to cover reveal fee. Required: ${requiredFeeContribution} sats, Available: ${totalAvailablePaymentValue} sats`,
    );
  }

  // Select UTXOs until the fee is covered
  let accumulatedPaymentValue = 0;
  const selectedUtxos = [];
  for (const utxo of availablePaymentUtxos) {
    selectedUtxos.push(utxo);
    accumulatedPaymentValue += utxo.value;
    if (accumulatedPaymentValue >= requiredFeeContribution) {
      break; // Stop adding UTXOs once enough value is accumulated
    }
  }

  // Add selected payment UTXOs as inputs
  for (const selectedUtxo of selectedUtxos) {
    const paymentInputIndex = inputIndex;
    const paymentScript = bitcoin.address.toOutputScript(userPaymentAddress);
    const paymentInputValue = Math.floor(selectedUtxo.value);

    if (userPaymentAddress.startsWith("3")) {
      // P2SH-P2WPKH
      if (!revealParams.paymentPublicKey) {
        throw new Error("Payment public key is required for P2SH addresses");
      }
      const publicKeyBuffer = Buffer.from(revealParams.paymentPublicKey, "hex");
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKeyBuffer });
      revealPsbt.addInput({
        hash: selectedUtxo.txid,
        index: selectedUtxo.vout,
        witnessUtxo: {
          script: paymentScript,
          value: BigInt(paymentInputValue),
        },
        redeemScript: p2wpkh.output,
      });
    } else {
      // P2TR or P2WPKH
      revealPsbt.addInput({
        hash: selectedUtxo.txid,
        index: selectedUtxo.vout,
        witnessUtxo: {
          script: paymentScript,
          value: BigInt(paymentInputValue),
        },
      });
    }
    inputSigningMap.push({
      index: paymentInputIndex,
      address: userPaymentAddress,
    });

    totalInputValue += paymentInputValue; //
    inputIndex++;
  }

  // --- 4. Add Outputs ---
  let totalOutputValue = 0;

  // Output 0: Send parent ordinal back to its owner -> send back to oracle
  // Note: The actual sat carrying the parent inscription will flow here.
  revealPsbt.addOutput({
    address: ORACLE_TAPROOT_ADDRESS, // Send parent back to its owner
    value: BigInt(DUST_LIMIT), // Send dust value
  });
  totalOutputValue += DUST_LIMIT;

  // Output 1: New child inscription -> Send to user
  revealPsbt.addOutput({
    address: userOrdinalsAddress, // Send the new inscription here
    value: BigInt(revealParams.postage),
  });
  totalOutputValue += revealParams.postage;

  // Output 2: Change (optional)
  // Calculate fee based on known inputs and the two fixed outputs
  const changeAmount =
    totalInputValue - totalOutputValue - revealParams.revealFee;

  console.log("Calculated changeAmount:", changeAmount);
  console.log("Using estimated revealFee:", revealParams.revealFee);

  // Check if change is needed and exceeds dust
  if (changeAmount > DUST_LIMIT) {
    revealPsbt.addOutput({
      address: userPaymentAddress, // Send change back to payment address
      value: BigInt(changeAmount),
    });
    totalOutputValue += changeAmount;
  }

  // Final actual fee calculation
  const finalActualFee = totalInputValue - totalOutputValue;

  // --- 5. Finalize and Return ---
  const expectedTxid = calculateExpectedTxId(revealPsbt);

  // ORACLE
  signParentP2TRInput(revealPsbt);

  return {
    revealPsbt: revealPsbt.toBase64(),
    revealFee: finalActualFee, // Return the calculated fee
    // The new inscription is always the first output (index 0)
    expectedInscriptionId: `${expectedTxid}i0`,
    inputSigningMap,
  };
}
