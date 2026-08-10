import { prepareCommitTx } from "@/lib/bitcoin/transaction/commit/commit-tx";
import { mempoolClient } from "@/lib/external/mempool-client";
import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { PrepareCommitRequestSchema } from "@/lib/zod-types/commit-types";
import { AppError } from "@/lib/error/error-types/app-error";
import { ErrorCode } from "@/lib/error/codes/error-codes";
import crypto from "crypto";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();

  const validatedBody = PrepareCommitRequestSchema.safeParse(body);
  if (!validatedBody.success) {
    throw new AppError(validatedBody.error.message, ErrorCode.INVALID_PARAMETERS);
  }

  const {
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    paymentPublicKey,
  } = validatedBody.data;

  const sessionId = crypto.randomBytes(16).toString('hex');

  const fastFeeRate = await mempoolClient.getFastestFee();

  console.log("Creating commit transaction with:", {
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    paymentPublicKey,
    feeRate: fastFeeRate,
    sessionId,
  });

  // Prepare the commit transaction
  const commitResult = await prepareCommitTx(
    paymentAddress,
    ordinalsAddress,
    ordinalsPublicKey,
    sessionId,
    {
      feeRate: fastFeeRate,
      paymentPublicKey,
    },
  );

  return Response.json({
    commitPsbt: commitResult.commitPsbt,
    sessionId,
  });
});
