import { ECPairInterface } from "ecpair";
import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { Psbt } from "bitcoinjs-lib";
import * as bitcoin from "bitcoinjs-lib";
import { ECPair } from "../core/bitcoin-config";
import { createTweakedKeyPairForTaproot } from "./tweak";
import { env } from "@/env";

// TODO: remove later, do the same in config
bitcoin.initEccLib(secp256k1);

function getKeyPairFromPrivateWif(): ECPairInterface {
  const privateKeyWif = env.ORACLE_PRIVATE_KEY_WIF;
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

  // Sign input 0
  // bitcoinjs-lib handles the correct sighash type for P2TR if the
  // witnessUtxo and tapInternalKey fields are correctly populated in the PSBT input.
  psbt.signInput(0, tweakedKeyPair);

  return psbt;
}
