import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { ECPairInterface } from "ecpair";
import { bitcoin, ECPair } from "../core/bitcoin-config";

/**
 * Checks the parity of a compressed public key.
 *
 * In Bitcoin, compressed public keys are 33 bytes where the first byte indicates
 * the parity of the y-coordinate:
 * - 0x02: Even y-coordinate
 * - 0x03: Odd y-coordinate
 *
 * This is particularly important for Taproot key path spending, where
 * private key tweaking depends on the original key's parity.
 *
 */
export function checkParity(compressedPubKey: Uint8Array): number {
  if (compressedPubKey[0] % 2 === 1) {
    return 1; // ODD
  }
  return 0; // even
}

/**
 * Conditionally negates a private key based on the parity of its corresponding compressed public key.
 *
 * In Taproot key path spending, a private key must be negated before tweaking if
 * its corresponding public key has an odd y-coordinate. This function handles that
 * conditional negation based on the compressed public key's first byte.
 */
export function adjustPrivateKeyForParity(
  compressedPubKey: Uint8Array,
  privateKey: Uint8Array,
): Uint8Array {
  const publicKeyParity = checkParity(compressedPubKey);
  let adjustedPrivateKey = privateKey;
  if (publicKeyParity === 1) {
    adjustedPrivateKey = secp256k1.privateNegate(adjustedPrivateKey);
  }
  return adjustedPrivateKey;
}

/**
 * Creates a tweaked signer for Taproot key-path spending
 */
export function createTweakedKeyPairForTaproot(
  keyPair: ECPairInterface,
): ECPairInterface {
  // Calculate x-only pubkey
  const compressedPubkey = keyPair.publicKey;
  const xOnlyPubkey = secp256k1.xOnlyPointFromPoint(compressedPubkey);

  const tweak = bitcoin.crypto.taggedHash("TapTweak", xOnlyPubkey);

  // Get the tweak result to check parity
  const tweakResult = secp256k1.xOnlyPointAddTweak(xOnlyPubkey, tweak);
  if (!tweakResult) {
    throw new Error("Failed to calculate tweaked pubkey");
  }

  // Prepare the private key for signing
  let privateKey = keyPair.privateKey;
  if (!privateKey) {
    throw new Error("Private key is required for signing");
  }

  privateKey = adjustPrivateKeyForParity(
    keyPair.publicKey,
    keyPair.privateKey!,
  );

  // Add the tweak to the private key
  const tweakedPrivateKey = secp256k1.privateAdd(privateKey, tweak);
  if (!tweakedPrivateKey) {
    throw new Error("Failed to tweak private key");
  }

  // Create a new ECPair with the tweaked private key
  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey));
}
