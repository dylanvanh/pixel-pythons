import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config"; // Ensure this path is correct
import { supabase } from "@/lib/supabase/config";
import { AppError } from "@/lib/error/error-types/app-error";
import { ErrorCode } from "@/lib/error/codes/error-codes";
import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { mempoolClient } from "@/lib/external/mempool-client";
import { BroadcastRevealRequestSchema } from "@/lib/zod-types/broadcast-reveal";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const parsedRequest = BroadcastRevealRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    throw new AppError(
      `Invalid data for broadcasting reveal: ${JSON.stringify(parsedRequest.error.flatten())}`,
      ErrorCode.INVALID_PARAMETERS,
    );
  }

  const { signedPsbtBase64, commitTxid, ordinalsAddress } = parsedRequest.data;
  let finalTxHex: string;

  try {
    const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64);
    finalTxHex = psbt.extractTransaction().toHex();
  } catch (error: unknown) {
    console.error(error);
    throw new AppError(
      "Failed to extract transaction data",
      ErrorCode.INVALID_PARAMETERS,
    );
  }

  let revealTxid: string;
  try {
    revealTxid = await mempoolClient.broadcastTransaction(finalTxHex);
  } catch (broadcastError: unknown) {
    console.error("Mempool API broadcast failed:", broadcastError);
    throw new AppError(
      "Failed to broadcast, please try again",
      ErrorCode.BROADCAST_FAILED,
    );
  }
  const inscriptionId = `${revealTxid}i0`;

  // Fail gracefully
  try {
    const { error } = await supabase.from("inscriptions").insert({
      inscription_id: inscriptionId,
      reveal_txid: revealTxid,
      commit_txid: commitTxid,
      ordinals_address: ordinalsAddress,
    });
    if (error) console.error("Error saving inscription:", error);
  } catch (dbError: unknown) {
    console.error("Database error saving mint record post-broadcast:", dbError);
  }

  return Response.json({
    revealTxid: revealTxid,
  });
});
