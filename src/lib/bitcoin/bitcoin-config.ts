import * as secp256k1 from "@bitcoinerlab/secp256k1";
import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";

// Initialize the ECC library
bitcoin.initEccLib(secp256k1);

// Create an ECPair factory
const ECPair = ECPairFactory(secp256k1);

// Create a BIP32 factory
const bip32 = BIP32Factory(secp256k1);

export async function getSeedFromMnemonic(mnemonic: string) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return seed;
}

export async function getRootFromSeed(seed: Uint8Array) {
  return bip32.fromSeed(seed);
}

export async function getRootWIFFromMnemonic(mnemonic: string) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return seed;
}

export enum AddressType {
  NATIVE_SEGWIT = "NATIVE_SEGWIT",
  NESTED_SEGWIT = "NESTED_SEGWIT",
  LEGACY = "LEGACY",
  TAPROOT = "TAPROOT",
}

/*
  m / purpose' / coin_type' / account' / change / address_index
  m: Master node (root of the HD wallet)
  purpose': Specifies the type of wallet (e.g., 44' for BIP44, 84' for BIP84)
  coin_type': Specifies the coin or network (e.g., 0' for Bitcoin mainnet)
  account': Account number (allows for multiple accounts)
  change: 0 for external (receiving) addresses, 1 for internal (change) addresses
  address_index: Sequential index of the address
*/
export function getDerivationPath(
  addressIndex: number,
  addressType: AddressType,
  accountNumber: number = 0,
): string {
  const coinType = 0; // mainnet = 0 , testnet = 1

  switch (addressType) {
    case AddressType.NATIVE_SEGWIT:
      return `m/84'/${coinType}'/${accountNumber}'/0/${addressIndex}`;
    case AddressType.NESTED_SEGWIT:
      return `m/49'/${coinType}'/${accountNumber}'/0/${addressIndex}`;
    case AddressType.LEGACY:
      return `m/44'/${coinType}'/${accountNumber}'/0/${addressIndex}`;
    case AddressType.TAPROOT:
      return `m/86'/${coinType}'/${accountNumber}'/0/${addressIndex}`;
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }
}

export type WalletInfo = {
  address: string;
  privateKeyWIF: string;
  publicKey: string;
  addressType: AddressType;
};

export { bip32, bitcoin, ECPair };
