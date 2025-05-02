import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config"; // Ensure this path is correct
import { saveInscriptionRecord } from "@/lib/supabase/save-inscription";
import { BroadcastFailedError } from "@/lib/error/error-types/broadcast-failed-error";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";
import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { mempoolClient } from "@/lib/external/mempool-client";
import { BroadcastRevealRequestSchema } from "@/lib/zod-types/broadcast-reveal";

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const parsedRequest = BroadcastRevealRequestSchema.safeParse(body);

  console.log("parsedRequest", parsedRequest);

  if (!parsedRequest.success) {
    throw new InvalidParametersError(
      `Invalid data for broadcasting reveal: ${JSON.stringify(parsedRequest.error.flatten())}`,
    );
  }

  const { signedPsbtBase64, commitTxid, ordinalsAddress } = parsedRequest.data;
  let finalTxHex: string;

  try {
    const psbt = bitcoin.Psbt.fromBase64(signedPsbtBase64);
    finalTxHex = psbt.extractTransaction().toHex();
  } catch (error: unknown) {
    console.error(error);
    throw new InvalidParametersError(`Failed to extract transaction data`);
  }

  let revealTxid: string;
  try {
    revealTxid = await mempoolClient.broadcastTransaction(finalTxHex);
  } catch (broadcastError: unknown) {
    console.error("Mempool API broadcast failed:", broadcastError);
    throw new BroadcastFailedError("Failed to broadcast, please try again");
  }
  const inscriptionId = `${revealTxid}i0`;

  // Fail gracefully
  try {
    await saveInscriptionRecord({
      inscriptionId,
      revealTxid,
      commitTxid,
      ordinalsAddress,
    });
  } catch (dbError: unknown) {
    console.error("Database error saving mint record post-broadcast:", dbError);
  }

  return Response.json({
    revealTxid: revealTxid,
    inscriptionId: inscriptionId,
  });
});
