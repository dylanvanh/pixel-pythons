import { ECPairInterface } from "ecpair";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { Psbt } from "bitcoinjs-lib";
import * as bitcoin from "bitcoinjs-lib";
import { ECPair } from "../core/bitcoin-config";
import { createTweakedKeyPairForTaproot } from "./tweak";

// TODO: remove later, do the same in config
bitcoin.initEccLib(secp256k1);

function getKeyPairFromPrivateWif(): ECPairInterface {
  const privateKeyWif = process.env.ORACLE_PRIVATE_KEY_WIF!;
  if (!privateKeyWif) {
    throw new Error("PRIVATE_KEY_WIF environment variable is not set.");
  }
  return ECPair.fromWIF(privateKeyWif);
}

/**
 * Signs the P2TR (Taproot) input at index 0 of the given PSBT
 * using the private key derived from the PRIVATE_KEY_WIF environment variable.
 * Assumes the PSBT's input 0 is a P2TR input and the private key
 * corresponds to the Taproot internal key required for signing.
 * @returns The modified PSBT with input 0 signed.
 */
export function signParentP2TRInput(psbt: Psbt): Psbt {
  const keyPair = getKeyPairFromPrivateWif();

  const tweakedKeyPair = createTweakedKeyPairForTaproot(keyPair);

  // Ensure input 0 exists
  if (!psbt.txInputs[0]) {
    throw new Error("PSBT does not have an input at index 0.");
  }

  console.log("keyPairpub", tweakedKeyPair.publicKey);
  console.log("keyPaircompressed", tweakedKeyPair.compressed);

  // Sign input 0
  // bitcoinjs-lib handles the correct sighash type for P2TR if the
  // witnessUtxo and tapInternalKey fields are correctly populated in the PSBT input.
  psbt.signInput(0, tweakedKeyPair);

  return psbt;
}

interface DummyKeyPairInfo {
  privateKeyWif: string;
  publicKeyHex: string;
  taprootAddress: string;
  tweakedKeyPair: ECPairInterface; // The keypair used for Taproot signing
}

//TODO: Delete when done
export function generateDummyTaprootKeys(
  network: bitcoin.networks.Network = bitcoin.networks.bitcoin,
): DummyKeyPairInfo {
  // 1. Generate a random key pair
  const keyPair = ECPair.makeRandom({ network });
  const privateKeyWif = keyPair.toWIF();
  const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");

  // 2. Derive the Taproot (P2TR) address
  // Taproot uses the *internal* public key (x-only pubkey)
  const internalPublicKey = secp256k1.xOnlyPointFromPoint(keyPair.publicKey);

  console.log("internalPublicKey", internalPublicKey);

  const p2tr = bitcoin.payments.p2tr({
    internalPubkey: internalPublicKey,
    network: network,
  });

  if (!p2tr.address) {
    throw new Error("Could not generate Taproot address.");
  }

  // 3. Tweak the keypair for signing (needed if signing key-path spends)
  // This is the keypair you'd actually use to sign Taproot inputs
  const tweakedKeyPair = keyPair.tweak(
    bitcoin.crypto.taggedHash("TapTweak", internalPublicKey),
  );

  return {
    privateKeyWif: privateKeyWif,
    publicKeyHex: publicKeyHex, // Original pubkey
    taprootAddress: p2tr.address,
    tweakedKeyPair: tweakedKeyPair, // Use this for signing
  };
}

//TODO: Delete when done
// Generate keys for Testnet
const generatedKeys = generateDummyTaprootKeys(bitcoin.networks.testnet);
console.log("Private Key WIF:", generatedKeys.privateKeyWif);
console.log("Public Key:", generatedKeys.publicKeyHex);
console.log("Taproot Address:", generatedKeys.taprootAddress);
