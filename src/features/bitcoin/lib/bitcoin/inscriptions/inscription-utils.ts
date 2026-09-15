import { Buffer } from "buffer";
import { bitcoin } from "@/features/bitcoin/lib/bitcoin/core/bitcoin-config";
import { getBitcoinEnv } from "@/features/bitcoin/server/env.server";

const MAX_SCRIPT_CHUNK_BYTES = 520;
const INSCRIPTION_INDEX_BYTES = 4;

/**
 * Creates an inscription script for ordinals
 */
export function createInscriptionScript(
  xOnlyPubkey: Uint8Array,
  contentType: Buffer,
  content: Buffer | Uint8Array,
): Uint8Array {
  // Ensure content is Buffer type
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

  const parentInscriptionId = getBitcoinEnv().NEXT_PUBLIC_PARENT_INSCRIPTION_ID;

  // Calculate how many chunks we need due to Bitcoin's push limit
  const contentChunks: Buffer[] = [];
  let contentOffset = 0;

  // Split content into chunks under 520 bytes
  while (contentOffset < contentBuffer.length) {
    const remainingBytes = contentBuffer.length - contentOffset;
    const chunkSizeBytes = Math.min(remainingBytes, MAX_SCRIPT_CHUNK_BYTES);

    contentChunks.push(contentBuffer.slice(contentOffset, contentOffset + chunkSizeBytes));
    contentOffset += chunkSizeBytes;
  }

  // Prepare parent push elements if a parent ID is provided
  const parentTagElements = createParentTagElements(parentInscriptionId);

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
export function estimateCommitFeeInSats(inputCount: number, feeRateSatsPerVbyte: number): number {
  // Basic size estimation for commit tx
  const baseSizeVbytes = 10; // Version, locktime
  const inputSizeVbytes = 68; // Average P2WPKH input size
  const taprootOutputSizeVbytes = 43;
  const changeOutputSizeVbytes = 31;
  const outputSizeVbytes = taprootOutputSizeVbytes + changeOutputSizeVbytes; // Taproot output + change

  const estimatedSizeVbytes = baseSizeVbytes + inputCount * inputSizeVbytes + outputSizeVbytes;

  return Math.ceil(estimatedSizeVbytes * feeRateSatsPerVbyte);
}

/**
 * Estimates fee for reveal transaction
 */
export function estimateRevealFeeInSats(
  contentSizeBytes: number,
  feeRateSatsPerVbyte: number,
): number {
  // Basic size estimation for reveal tx
  const baseSizeVbytes = 10; // Version, locktime
  const inputSizeVbytes = 100; // Average taproot input size
  const baseScriptSizeBytes = 100;
  const scriptSizeBytes = baseScriptSizeBytes + contentSizeBytes; // Base script + content
  const witnessScaleFactor = 4;
  const witnessSizeVbytes = scriptSizeBytes / witnessScaleFactor; // Witness data is discounted
  const outputSizeVbytes = 31; // Standard P2TR output

  const estimatedSizeVbytes =
    baseSizeVbytes + inputSizeVbytes + witnessSizeVbytes + outputSizeVbytes;

  return Math.ceil(estimatedSizeVbytes * feeRateSatsPerVbyte);
}

function createParentTagElements(parentInscriptionId: string): Array<Uint8Array | number> {
  if (!parentInscriptionId) {
    return [];
  }

  const [transactionIdHex, inscriptionIndexText] = parentInscriptionId.split("i");

  // parse txid and reverse bytes to get raw binary
  const transactionIdBytes = Buffer.from(transactionIdHex, "hex").reverse();

  // little-endian index
  const inscriptionIndex = parseInt(inscriptionIndexText, 10) || 0;
  const indexBuffer = Buffer.alloc(INSCRIPTION_INDEX_BYTES);
  indexBuffer.writeUInt32LE(inscriptionIndex, 0);

  // strip trailing zeroes
  let lastNonzeroByteIndex = indexBuffer.length - 1;

  while (lastNonzeroByteIndex >= 0 && indexBuffer[lastNonzeroByteIndex] === 0) {
    lastNonzeroByteIndex--;
  }

  const indexBytes = indexBuffer.slice(0, lastNonzeroByteIndex + 1);
  const parentBytes = Buffer.concat([Buffer.from(transactionIdBytes), indexBytes]);

  return [bitcoin.opcodes.OP_3, Uint8Array.from(parentBytes)];
}
