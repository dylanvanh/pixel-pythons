import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  AddressType,
  bitcoin,
  ECPair,
  getDerivationPath,
  getRootFromSeed,
  getSeedFromMnemonic,
  WalletInfo,
} from "./bitcoin/bitcoin-config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function generateAddressFromMnemonic(
  mnemonic: string,
  addressIndex: number = 0,
  addressType = AddressType.NATIVE_SEGWIT,
): Promise<WalletInfo> {
  const seed = await getSeedFromMnemonic(mnemonic);
  const root = await getRootFromSeed(seed);
  const derivationPath = getDerivationPath(addressIndex, addressType);
  const child = root.derivePath(derivationPath);
  const keyPair = ECPair.fromPrivateKey(child.privateKey!);

  // Generate the appropriate address type
  let address: string | undefined;
  switch (addressType) {
    case AddressType.NATIVE_SEGWIT:
      address = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
      }).address;
      break;
    case AddressType.NESTED_SEGWIT:
      address = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({
          pubkey: keyPair.publicKey,
        }),
      }).address;
      break;
    case AddressType.LEGACY:
      address = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
      }).address;
      break;
    case AddressType.TAPROOT:
      // Convert the 33-byte public key to a 32-byte x-only pubkey and to Buffer
      const xOnlyPubkey = Buffer.from(keyPair.publicKey.slice(1));
      address = bitcoin.payments.p2tr({
        internalPubkey: xOnlyPubkey,
      }).address;
      break;
    default:
      throw new Error(`Unsupported address type: ${addressType}`);
  }

  if (!address) {
    throw new Error("Failed to generate address");
  }

  return {
    address,
    privateKeyWIF: keyPair.toWIF(),
    publicKey: Buffer.from(child.publicKey).toString("hex"),
    addressType,
  };
}
