import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { PARENT_INSCRIPTION_ID } from "@/lib/constants";

/**
 * Creates an inscription script for ordinals
 */
export function createInscriptionScript(
  xOnlyPubkey: Uint8Array,
  contentType: Buffer,
  content: Buffer | Uint8Array,
): Uint8Array {
  // Ensure content is Buffer type
  const contentBuffer = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content);

  const parentInscriptionId = PARENT_INSCRIPTION_ID;

  // Calculate how many chunks we need due to Bitcoin's push limit
  const MAX_CHUNK_SIZE = 520;
  const contentChunks: Buffer[] = [];
  let currentPos = 0;

  // Split content into chunks under 520 bytes
  while (currentPos < contentBuffer.length) {
    const remainingBytes = contentBuffer.length - currentPos;
    const chunkSize = Math.min(remainingBytes, MAX_CHUNK_SIZE);
    contentChunks.push(contentBuffer.slice(currentPos, currentPos + chunkSize));
    currentPos += chunkSize;
  }

  // Prepare parent push elements if a parent ID is provided
  const parentTagElements: Array<Uint8Array | number> = parentInscriptionId
    ? (() => {
        const [hex, indexStr] = parentInscriptionId.split("i");
        // parse txid and reverse bytes to get raw binary
        const txidBytes = hexToBytes(hex).reverse();
        // little-endian index
        const indexNum = parseInt(indexStr, 10) || 0;
        const indexBuffer = Buffer.alloc(4);
        indexBuffer.writeUInt32LE(indexNum, 0);
        // strip trailing zeroes
        let idx = indexBuffer.length - 1;
        while (idx >= 0 && indexBuffer[idx] === 0) idx--;
        const indexBytes = indexBuffer.slice(0, idx + 1);
        const parentBytes = Buffer.concat([Buffer.from(txidBytes), indexBytes]);
        return [bitcoin.opcodes.OP_3, Uint8Array.from(parentBytes)];
      })()
    : [];

  const scriptElements = [
    Uint8Array.from(xOnlyPubkey),
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_FALSE,
    bitcoin.opcodes.OP_IF,
    Uint8Array.from(Buffer.from("ord", "utf8")),
    bitcoin.opcodes.OP_1,
    Uint8Array.from(contentType),
    ...parentTagElements,
    bitcoin.opcodes.OP_0,
    ...contentChunks.map((chunk) => Uint8Array.from(chunk)),
    bitcoin.opcodes.OP_ENDIF,
  ];

  return bitcoin.script.compile(scriptElements);
}

/**
 * Estimates fee for commit transaction
 */
export function estimateCommitFee(numInputs: number, feeRate: number): number {
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
export function estimateRevealFee(
  contentSize: number,
  feeRate: number,
): number {
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
 * NOTE: THIS WILL ONLY WORK FOR ADDRESSES THAT USE *WITNESS*
 * Should probs be better to wait for broadcast of commmitTx , then pass back commitTxId to create the reveal
 */
export function calculateExpectedTxId(psbt: bitcoin.Psbt): string {
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
      throw e;
    }
  } catch (error) {
    console.error("Error extracting transaction from PSBT:", error);
    throw error;
  }
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Shared type definitions
 */
export type UTXO = {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
};

export type UserWalletInfo = {
  paymentAddress: string;
  ordinalsAddress: string;
  ordinalsPublicKey: string;
  paymentPublicKey?: string;
  utxos: UTXO[];
};

export type TextInscriptionData = {
  content: string;
  contentType?: string;
  postage?: number;
};
