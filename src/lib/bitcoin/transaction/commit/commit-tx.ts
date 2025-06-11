import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { DUST_LIMIT, DEFAULT_FEE_RATE } from "../../../constants";
import { estimateCommitFee } from "../../inscriptions/inscription-utils";
import { generateInscriptionData } from "../../inscriptions/generate-inscription-data";
import { InsufficientFundsError } from "@/lib/error/error-types/insufficient-funds-error";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";
import { UserWalletInfo } from "../../inscriptions/types";
import { getCleanPaymentUtxos } from "../../utxo/utxo-fetcher";

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



export async function prepareCommitTx(
  userPaymentAddress: string,
  userOrdinalsAddress: string,
  ordinalsPublicKey: string,
  mintIndex: number,
  options?: {
    feeRate?: number;
    paymentPublicKey?: string;
  },
): Promise<CommitPsbtResult> {
  const userUtxos = await getCleanPaymentUtxos(userPaymentAddress);

  const userWallet: UserWalletInfo = {
    paymentAddress: userPaymentAddress,
    ordinalsAddress: userOrdinalsAddress,
    ordinalsPublicKey: ordinalsPublicKey,
    paymentPublicKey: options?.paymentPublicKey,
    utxos: userUtxos,
  };

  const feeRate = options?.feeRate || DEFAULT_FEE_RATE;

  const inscriptionData = await generateInscriptionData(
    userOrdinalsAddress,
    mintIndex,
    ordinalsPublicKey,
    feeRate,
  );

  const commitFee = estimateCommitFee(userWallet.utxos.length, feeRate);
  const totalRequired = commitFee + inscriptionData.taprootRevealValue + 400;

  const userTotal = userWallet.utxos
    .filter((utxo) => Math.floor(utxo.value) > DUST_LIMIT)
    .reduce((sum, utxo) => sum + Math.floor(utxo.value), 0);

  if (userTotal < totalRequired) {
    throw new InsufficientFundsError(
      `Insufficient funds. Required: ${totalRequired} sats, Available: ${userTotal} sats for payment address: ${userPaymentAddress}`,
    );
  }

  const commitPsbt = new bitcoin.Psbt();

  for (const utxo of userWallet.utxos) {
    if (userWallet.paymentAddress.startsWith("3")) {
      if (!userWallet.paymentPublicKey) {
        throw new InvalidParametersError(
          "Payment public key is required for P2SH (starts with '3') addresses",
        );
      }
      const publicKeyBuffer = Buffer.from(userWallet.paymentPublicKey, "hex");
      const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKeyBuffer });
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

  commitPsbt.addOutput({
    script: inscriptionData.taprootRevealScript,
    value: BigInt(inscriptionData.taprootRevealValue),
  });

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
    taprootRevealScript: inscriptionData.taprootRevealScript,
    taprootRevealValue: inscriptionData.taprootRevealValue,
    revealFee: inscriptionData.revealFee,
    postage: inscriptionData.postage,
    controlBlock: inscriptionData.controlBlock,
    inscriptionScript: inscriptionData.inscriptionScript,
  };
}
