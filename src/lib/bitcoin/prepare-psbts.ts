import { bitcoin } from "@/lib/bitcoin/bitcoin-config";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { mempoolClient, UTXO } from "../external/mempool-client";
import { DUST_LIMIT } from "../constants";

/**
 * Interface for text inscription data
 */
interface TextInscriptionData {
  content: string;
  contentType?: string;
  postage?: number;
}

/**
 * Interface for user wallet information
 */
interface UserWalletInfo {
  paymentAddress: string;
  ordinalsAddress: string;
  ordinalsPublicKey: string; // User's taproot public key (hex string)
  utxos: UTXO[];
}

/**
 * Interface for inscription PSBT result
 */
interface InscriptionPsbtResult {
  commitPsbt: string; // Base64 encoded PSBT for commit transaction
  revealPsbt: string; // Base64 encoded PSBT for reveal transaction
  commitFee: number; // Fee for commit transaction in sats
  revealFee: number; // Fee for reveal transaction in sats
  totalFee: number; // Total fees in sats
  expectedInscriptionId?: string; // Expected inscription ID if known
}

/**
 * Creates a text inscription and returns the PSBTs for signing
 */
export async function prepareInscriptionPsbts(
  userPaymentAddress: string,
  userOrdinalsAddress: string,
  ordinalsPublicKey: string,
  options?: {
    text?: string;
    postage?: number;
    feeRate?: number;
  },
): Promise<InscriptionPsbtResult> {
  const userUtxos = await mempoolClient.getUTXOs(userPaymentAddress);

  const userWallet = {
    paymentAddress: userPaymentAddress,
    ordinalsAddress: userOrdinalsAddress,
    ordinalsPublicKey: ordinalsPublicKey,
    utxos: userUtxos,
  };

  const feeRate = options?.feeRate || 10;

  return createSimpleTextInscription(
    userWallet,
    {
      content: options?.text || "Hello world!!!!",
      contentType: "text/plain;charset=utf-8",
      postage: options?.postage || 10000, // 10k sats
    },
    feeRate,
  );
}

/**
 * Creates a simple text inscription PSBT for a user to sign with their web wallet
 *
 * @param bitcoinClient Bitcoin Core client instance
 * @param userWallet User's wallet information including public key
 * @param inscriptionData Inscription data
 * @param feeRate Fee rate in sats/vbyte
 * @returns Commit and reveal PSBTs for the user to sign
 */
export async function createSimpleTextInscription(
  userWallet: UserWalletInfo,
  inscriptionData: TextInscriptionData,
  feeRate: number = 10,
): Promise<InscriptionPsbtResult> {
  console.log(`Creating text inscription for "${inscriptionData.content}"`);

  // Prepare the inscription content
  const contentType = Buffer.from(
    inscriptionData.contentType || "text/plain;charset=utf-8",
  );
  const content = Buffer.from(inscriptionData.content);
  const postage = inscriptionData.postage || DUST_LIMIT;

  // Process the user's public key
  const userPubKey = Buffer.from(userWallet.ordinalsPublicKey, "hex");

  // Convert to x-only public key for Taproot - Fix for type error
  const pubKeyBytes = Uint8Array.from(userPubKey);
  const xOnlyPubkey = secp256k1.xOnlyPointFromPoint(pubKeyBytes);

  // Create the inscription script
  const inscriptionScript = createInscriptionScript(
    Uint8Array.from(xOnlyPubkey),
    contentType,
    content,
  );

  // Create taproot script tree
  const scriptTree = {
    output: inscriptionScript,
    version: 0xc0,
  };

  // Generate the taproot payment with witness data - Fix for type error
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

  // Add user payment inputs
  for (const utxo of userWallet.utxos) {
    commitPsbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.address.toOutputScript(userWallet.paymentAddress),
        value: BigInt(Math.floor(utxo.value)),
      },
    });
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

  // Calculate expected commit txid
  const commitTxid = calculateExpectedTxId(commitPsbt);

  // Create reveal transaction PSBT
  const revealPsbt = new bitcoin.Psbt();

  // Add input from commit transaction
  revealPsbt.addInput({
    hash: commitTxid,
    index: 0, // The first output is the taproot output
    witnessUtxo: {
      script: taprootPayment.output,
      value: BigInt(revealFee + postage),
    },
    tapLeafScript: [
      {
        leafVersion: 0xc0,
        script: inscriptionScript,
        controlBlock,
      },
    ],
  });

  // Add output for the inscription to go to user's ordinals address
  revealPsbt.addOutput({
    address: userWallet.ordinalsAddress,
    value: BigInt(postage),
  });

  return {
    commitPsbt: commitPsbt.toBase64(),
    revealPsbt: revealPsbt.toBase64(),
    commitFee,
    revealFee,
    totalFee: commitFee + revealFee,
    expectedInscriptionId: `${calculateExpectedTxId(revealPsbt)}_0`,
  };
}

/**
 * Creates an inscription script
 */
function createInscriptionScript(
  xOnlyPubkey: Uint8Array,
  contentType: Buffer,
  content: Buffer,
): Uint8Array {
  // Calculate how many chunks we need due to Bitcoin's push limit
  const MAX_CHUNK_SIZE = 520;
  const contentChunks: Buffer[] = [];
  let currentPos = 0;

  // Split content into chunks under 520 bytes
  while (currentPos < content.length) {
    const remainingBytes = content.length - currentPos;
    const chunkSize = Math.min(remainingBytes, MAX_CHUNK_SIZE);
    contentChunks.push(content.slice(currentPos, currentPos + chunkSize));
    currentPos += chunkSize;
  }

  // Create the script elements
  const scriptElements = [
    Uint8Array.from(xOnlyPubkey),
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_FALSE,
    bitcoin.opcodes.OP_IF,
    Uint8Array.from(Buffer.from("ord", "utf8")),
    bitcoin.opcodes.OP_1,
    Uint8Array.from(contentType),
    bitcoin.opcodes.OP_0,
    // Add content chunks (convert each to Uint8Array)
    ...contentChunks.map((chunk) => Uint8Array.from(chunk)),
    bitcoin.opcodes.OP_ENDIF,
  ];

  return bitcoin.script.compile(scriptElements);
}

/**
 * Estimates fee for commit transaction
 */
function estimateCommitFee(numInputs: number, feeRate: number): number {
  // Basic size estimation for commit tx
  const baseSize = 10; // Version, locktime
  const inputSize = 68; // Average P2WPKH input size
  const outputSize = 43 + 31; // Taproot output + change

  const estimatedVsize = baseSize + numInputs * inputSize + outputSize;
  return Math.ceil(estimatedVsize * feeRate);
}

/**
 * Estimates fee for reveal transaction
 */
function estimateRevealFee(contentSize: number, feeRate: number): number {
  // Basic size estimation for reveal tx
  const baseSize = 10; // Version, locktime
  const inputSize = 100; // Average taproot input size
  const scriptSize = 100 + contentSize; // Base script + content
  const witnessDiscount = scriptSize / 4; // Witness data is discounted
  const outputSize = 31; // Standard P2TR output

  const estimatedVsize = baseSize + inputSize + witnessDiscount + outputSize;
  return Math.ceil(estimatedVsize * feeRate);
}

/**
 * Calculate expected txid from PSBT
 */
function calculateExpectedTxId(psbt: bitcoin.Psbt): string {
  try {
    // Create a transaction with the inputs and outputs from the PSBT
    const tx = new bitcoin.Transaction();

    // Set version
    tx.version = psbt.version;

    // Add inputs
    psbt.txInputs.forEach((input) => {
      tx.addInput(
        Uint8Array.from(Buffer.from(input.hash)),
        input.index,
        input.sequence,
      );
    });

    // Add outputs
    psbt.txOutputs.forEach((output) => {
      tx.addOutput(output.script, output.value);
    });

    // Set locktime
    tx.locktime = psbt.locktime;

    // Generate txid
    return tx.getId();
  } catch (error) {
    console.error("Error calculating expected txid:", error);
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}

/**
 * Extract raw transaction hex from a PSBT string
 */
export function extractTransactionHexFromPsbt(psbtBase64: string): string {
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

    try {
      const tx = psbt.extractTransaction();
      return tx.toHex();
    } catch (e) {
      console.warn("Failed to extract transaction from PSBT:", e);

      try {
        console.log("Skipping signature validation (requires keypair)");
      } catch (e) {
        console.warn("Input 0 signature validation failed:", e);
      }

      throw e;
    }
  } catch (error) {
    console.error("Error extracting transaction from PSBT:", error);
    throw error;
  }
}
