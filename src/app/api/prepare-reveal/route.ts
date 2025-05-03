import { generateInscriptionData } from "@/lib/bitcoin/inscriptions/generate-inscription-data";
import { prepareRevealTx } from "@/lib/bitcoin/transaction/reveal/reveal-tx";
import { mempoolClient } from "@/lib/external/mempool-client";
import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { PrepareRevealRequestSchema } from "@/lib/zod-types/reveal-types";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();

  const validatedBody = PrepareRevealRequestSchema.safeParse(body);
  if (!validatedBody.success) {
    throw new InvalidParametersError(validatedBody.error.message);
  }

  const {
    commitTxid,
    ordinalsAddress,
    ordinalsPublicKey,
    paymentAddress,
    paymentPublicKey,
    mintIndex,
  } = validatedBody.data;

  const fastFeeRate = await mempoolClient.getFastestFee();

  console.log("Calling shared function for reveal transaction parameters:", {
    commitTxid,
    ordinalsAddress,
    ordinalsPublicKey: ordinalsPublicKey.substring(0, 10) + "...",
    paymentAddress,
    paymentPublicKey: paymentPublicKey,
    mintIndex,
    feeRate: fastFeeRate,
  });

  const inscriptionData = await generateInscriptionData(
    ordinalsAddress,
    mintIndex,
    ordinalsPublicKey,
    fastFeeRate,
  );

  // Construct revealParams using data from the shared function
  const revealParams = {
    taprootRevealScript: inscriptionData.taprootRevealScript,
    taprootRevealValue: inscriptionData.taprootRevealValue,
    controlBlock: inscriptionData.controlBlock,
    inscriptionScript: inscriptionData.inscriptionScript,
    postage: inscriptionData.postage,
    revealFee: inscriptionData.revealFee,
    paymentPublicKey,
  };

  // Prepare the reveal transaction
  const revealResult = await prepareRevealTx(
    commitTxid,
    ordinalsAddress,
    paymentAddress,
    revealParams,
  );

  console.log("Reveal result:", revealResult);

  // Return the reveal transaction data
  return Response.json({
    revealPsbt: revealResult.revealPsbt,
    revealFee: revealResult.revealFee,
    expectedInscriptionId: revealResult.expectedInscriptionId,
    inputSigningMap: revealResult.inputSigningMap,
  });
});
