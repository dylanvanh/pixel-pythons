import { Buffer } from "buffer";
import { bitcoin } from "@/features/bitcoin/lib/bitcoin/core/bitcoin-config";
import { DUST_LIMIT, DEFAULT_FEE_RATE } from "../../../constants";
import { estimateCommitFeeInSats } from "../../inscriptions/inscription-utils";
import { generateInscriptionData } from "../../inscriptions/generate-inscription-data";
import { AppError } from "@/features/bitcoin/lib/error/error-types/app-error";
import { ErrorCode } from "@/features/bitcoin/lib/error/codes/error-codes";
import { getCleanPaymentUtxos } from "../../utxo/utxo-fetcher";

export type CommitPsbtResult = {
  commitPsbt: string;
};

const COMMIT_FUNDING_BUFFER_SATS = 400;

export async function prepareCommitTx(
  userPaymentAddress: string,
  userOrdinalsAddress: string,
  ordinalsPublicKey: string,
  sessionId: string,
  options?: {
    feeRate?: number;
    paymentPublicKey?: string;
  },
): Promise<CommitPsbtResult> {
  const userUtxos = await getCleanPaymentUtxos(userPaymentAddress);

  const feeRate = options?.feeRate || DEFAULT_FEE_RATE;

  const inscriptionData = await generateInscriptionData(
    userOrdinalsAddress,
    sessionId,
    ordinalsPublicKey,
    feeRate,
  );

  const commitFeeSats = estimateCommitFeeInSats(userUtxos.length, feeRate);
  const requiredValueSats =
    commitFeeSats + inscriptionData.taprootRevealValue + COMMIT_FUNDING_BUFFER_SATS;

  const availableValueSats = userUtxos
    .filter((utxo) => Math.floor(utxo.value) > DUST_LIMIT)
    .reduce((sum, utxo) => sum + Math.floor(utxo.value), 0);

  if (availableValueSats < requiredValueSats) {
    throw new AppError(
      `Insufficient funds. Required: ${requiredValueSats} sats, Available: ${availableValueSats} sats for payment address: ${userPaymentAddress}`,
      ErrorCode.INSUFFICIENT_FUNDS,
    );
  }

  const commitPsbt = new bitcoin.Psbt();
  const paymentScript = bitcoin.address.toOutputScript(userPaymentAddress);
  let redeemScript: Uint8Array | undefined;

  if (userPaymentAddress.startsWith("3")) {
    if (!options?.paymentPublicKey) {
      throw new AppError(
        "Payment public key is required for P2SH (starts with '3') addresses",
        ErrorCode.INVALID_PARAMETERS,
      );
    }
    redeemScript = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(options.paymentPublicKey, "hex"),
    }).output;
  }

  for (const utxo of userUtxos) {
    commitPsbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: paymentScript,
        value: BigInt(Math.floor(utxo.value)),
      },
      ...(redeemScript && { redeemScript }),
    });
  }

  commitPsbt.addOutput({
    script: inscriptionData.taprootRevealScript,
    value: BigInt(inscriptionData.taprootRevealValue),
  });

  const changeSats = availableValueSats - requiredValueSats;

  if (changeSats > DUST_LIMIT) {
    commitPsbt.addOutput({
      address: userPaymentAddress,
      value: BigInt(changeSats),
    });
  }

  return {
    commitPsbt: commitPsbt.toBase64(),
  };
}
