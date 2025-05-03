import { prepareCommitTx } from "@/lib/bitcoin/transaction/commit/commit-tx";
import { mempoolClient } from "@/lib/external/mempool-client";
import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { PrepareCommitRequestSchema } from "@/lib/zod-types/commit-types";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";
import { getAndIncrementMintIndex } from "@/lib/supabase/get-and-increment-mint-index";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();

  const validatedBody = PrepareCommitRequestSchema.safeParse(body);
  if (!validatedBody.success) {
    throw new InvalidParametersError(validatedBody.error.message);
  }

  const {
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    paymentPublicKey,
  } = validatedBody.data;

  const mintIndex = await getAndIncrementMintIndex(ordinalsAddress);

  const fastFeeRate = await mempoolClient.getFastestFee();

  console.log("Creating commit transaction with:", {
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    paymentPublicKey,
    feeRate: fastFeeRate,
    mintIndex,
  });

  // Prepare the commit transaction
  const commitResult = await prepareCommitTx(
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    mintIndex,
    {
      feeRate: fastFeeRate,
      paymentPublicKey,
    },
  );

  // Return the commit transaction data AND necessary reveal parameters
  return Response.json({
    commitPsbt: commitResult.commitPsbt,
    commitFee: commitResult.commitFee,
    controlBlock: Buffer.from(commitResult.controlBlock).toString("hex"),
    inscriptionScript: Buffer.from(commitResult.inscriptionScript).toString(
      "hex",
    ),
    taprootRevealScript: Buffer.from(commitResult.taprootRevealScript).toString(
      "hex",
    ),
    taprootRevealValue: commitResult.taprootRevealValue,
    revealFee: commitResult.revealFee,
    postage: commitResult.postage,
    mintIndex,
  });
});
