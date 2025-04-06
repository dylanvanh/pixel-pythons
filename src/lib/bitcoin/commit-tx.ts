import { bitcoin } from "@/lib/bitcoin/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { mempoolClient } from "../external/mempool-client";
import { DUST_LIMIT, DEFAULT_FEE_RATE } from "../constants";
import {
  UserWalletInfo,
  estimateCommitFee,
  estimateRevealFee,
  createInscriptionScript,
  hexToBytes,
} from "./inscription-utils";

/**
 * Interface for commit transaction preparation result
 */
export type CommitPsbtResult = {
  commitPsbt: string;
  commitFee: number;
  taprootRevealScript: Uint8Array;
  taprootRevealValue: number;
  revealFee: number;
  postage: number;
  controlBlock: Uint8Array;
  inscriptionScript: Uint8Array;
};

/**
 * Prepares the commit transaction for a text inscription
 */
export async function prepareCommitTx(
  userPaymentAddress: string,
  userOrdinalsAddress: string,
  ordinalsPublicKey: string,
  options?: {
    postage?: number;
    feeRate?: number;
    paymentPublicKey?: string;
  },
): Promise<CommitPsbtResult> {
  const userUtxos = await mempoolClient.getUTXOs(userPaymentAddress);

  const userWallet: UserWalletInfo = {
    paymentAddress: userPaymentAddress,
    ordinalsAddress: userOrdinalsAddress,
    ordinalsPublicKey: ordinalsPublicKey,
    paymentPublicKey: options?.paymentPublicKey,
    utxos: userUtxos,
  };

  const feeRate = options?.feeRate || DEFAULT_FEE_RATE;
  const text = "Minting coming soon...";
  const postage = options?.postage || DUST_LIMIT;

  // Prepare the inscription content
  const contentType = Buffer.from("text/plain;charset=utf-8");
  const content = Buffer.from(text);

  // Process the user's public key
  const userPubKey = Buffer.from(userWallet.ordinalsPublicKey, "hex");

  // Determine if key is already in x-only format (32 bytes) or compressed format (33 bytes)
  let xOnlyPubkey: Uint8Array;
  if (userPubKey.length === 32) {
    // Already in x-only format, use it directly
    xOnlyPubkey = Uint8Array.from(userPubKey);
  } else {
    // Convert to x-only public key for Taproot
    const pubKeyBytes = Uint8Array.from(userPubKey);
    xOnlyPubkey = secp256k1.xOnlyPointFromPoint(pubKeyBytes);
  }

  // Create the inscription script
  const inscriptionScript = createInscriptionScript(
    xOnlyPubkey,
    contentType,
    content,
  );

  // Create taproot script tree
  const scriptTree = {
    output: inscriptionScript,
    version: 0xc0,
  };

  // Generate the taproot payment with witness data
  const taprootPayment = bitcoin.payments.p2tr({
    internalPubkey: Uint8Array.from(xOnlyPubkey),
    scriptTree,
    redeem: {
      output: inscriptionScript,
      redeemVersion: 0xc0,
    },
  });

  if (
    !taprootPayment.output ||
    !taprootPayment.address ||
    !taprootPayment.witness
  ) {
    throw new Error("Failed to generate taproot payment");
  }

  // Get the control block from the witness data
  const controlBlock =
    taprootPayment.witness[taprootPayment.witness.length - 1];

  // Calculate fees
  const revealFee = estimateRevealFee(content.length, feeRate);
  const commitFee = estimateCommitFee(userWallet.utxos.length, feeRate);
  const totalRequired = commitFee + revealFee + postage + 1000; // Extra buffer for safety

  // Calculate user's total input amount
  const userTotal = userWallet.utxos.reduce(
    (sum, utxo) => sum + Math.floor(utxo.value),
    0,
  );

  // Check if user has enough funds
  if (userTotal < totalRequired) {
    throw new Error(
      `Insufficient funds. Required: ${totalRequired} sats, Available: ${userTotal} sats`,
    );
  }

  // Create commit transaction PSBT
  const commitPsbt = new bitcoin.Psbt();

  // When adding inputs to the commit PSBT
  for (const utxo of userWallet.utxos) {
    // For P2SH addresses (starting with '3')
    if (userWallet.paymentAddress.startsWith("3")) {
      if (!userWallet.paymentPublicKey) {
        throw new Error("Payment public key is required for P2SH addresses");
      }

      const publicKeyBuffer = Buffer.from(userWallet.paymentPublicKey, "hex");

      // Create a P2WPKH payment object (for nested SegWit in P2SH)
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKeyBuffer });

      // Add the input with the required redeemScript
      commitPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(userWallet.paymentAddress),
          value: BigInt(Math.floor(utxo.value)),
        },
        redeemScript: p2wpkh.output,
      });
    } else {
      // Default handling for non-P2SH addresses
      commitPsbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(userWallet.paymentAddress),
          value: BigInt(Math.floor(utxo.value)),
        },
      });
    }
  }

  /* Add outputs to commit transaction */

  // Output 0: Taproot output for the inscription reveal
  commitPsbt.addOutput({
    script: taprootPayment.output,
    value: BigInt(revealFee + postage),
  });

  // Output 1: Change back to user (if above dust limit)
  const changeAmount = userTotal - totalRequired;
  if (changeAmount > DUST_LIMIT) {
    commitPsbt.addOutput({
      address: userWallet.paymentAddress,
      value: BigInt(changeAmount),
    });
  }

  return {
    commitPsbt: commitPsbt.toBase64(),
    commitFee,
    taprootRevealScript: taprootPayment.output,
    taprootRevealValue: revealFee + postage,
    revealFee,
    postage,
    controlBlock,
    inscriptionScript,
  };
}

/**
 * Creates reveal parameters from the ordinals public key
 */
export function createRevealParams(
  ordinalsPublicKey: string | Uint8Array,
  options?: {
    text?: string;
    feeRate?: number;
    postage?: number;
  },
) {
  // Set default values
  const text = options?.text || "Minting coming soon...";
  const feeRate = options?.feeRate || DEFAULT_FEE_RATE;
  const postage = options?.postage || DUST_LIMIT;

  // Get the xonly pubkey
  let pubkey: Uint8Array;
  if (typeof ordinalsPublicKey === "string") {
    pubkey = hexToBytes(ordinalsPublicKey);
    // Check if it's not x-only and convert if needed
    if (pubkey.length === 33) {
      pubkey = pubkey.slice(1); // Convert to x-only format
    }
  } else {
    pubkey = ordinalsPublicKey;
    if (pubkey.length === 33) {
      pubkey = pubkey.slice(1); // Convert to x-only format
    }
  }

  // Prepare the inscription content
  const inscriptionContent = Buffer.from(text);
  const contentType = Buffer.from("text/plain;charset=utf-8");

  // Create the inscription script
  const inscriptionScript = createInscriptionScript(
    pubkey,
    contentType,
    inscriptionContent,
  );

  // Create taproot script tree
  const scriptTree = {
    output: inscriptionScript,
    version: 0xc0,
  };

  // Generate the taproot payment with witness data
  const taprootPayment = bitcoin.payments.p2tr({
    internalPubkey: pubkey,
    scriptTree,
    redeem: {
      output: inscriptionScript,
      redeemVersion: 0xc0,
    },
  });

  if (
    !taprootPayment.output ||
    !taprootPayment.address ||
    !taprootPayment.witness
  ) {
    throw new Error("Failed to generate taproot payment");
  }

  // Get the control block from the witness data
  const controlBlock =
    taprootPayment.witness[taprootPayment.witness.length - 1];

  // Calculate fees
  const revealFee = estimateRevealFee(inscriptionContent.length, feeRate);

  // Return the reveal parameters
  return {
    taprootRevealScript: taprootPayment.output,
    taprootRevealValue: revealFee + postage,
    controlBlock,
    inscriptionScript,
    postage,
    revealFee,
  };
}

