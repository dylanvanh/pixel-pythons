import { withErrorHandling } from "@/lib/error/middleware/error-middleware";
import { InvalidParametersError } from "@/lib/error/error-types/invalid-parameters-error";
import { mempoolClient } from "@/lib/external/mempool-client";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config"; // Ensure this path is correct
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin"; // Import the Supabase admin client

const BroadcastRevealRequestSchema = z.object({
  signedPsbtBase64: z.string().min(50), // Expecting signed PSBT Base64
  commitTxid: z.string().min(64).max(64).optional(),
  ordinalsAddress: z.string().min(1).optional(),
});

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json();
  const parsedRequest = BroadcastRevealRequestSchema.safeParse(body);

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
    console.log("Extracted final TX hex from signed PSBT for broadcast.");
  } catch (error: unknown) {
    console.error("Error processing signed PSBT:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error during PSBT processing";
    throw new InvalidParametersError(
      `Failed to process signed transaction data: ${message}`,
    );
  }

  let revealTxid: string;
  try {
    console.log(
      "Broadcasting final reveal hex:",
      finalTxHex.substring(0, 60) + "...",
    );
    revealTxid = await mempoolClient.broadcastTransaction(finalTxHex);
    console.log(
      `Transaction broadcast successfully. Reveal TXID: ${revealTxid}`,
    );
  } catch (broadcastError: unknown) {
    console.error("Mempool API broadcast failed:", broadcastError);
    let message = "Unknown broadcast error";
    if (broadcastError instanceof Error) {
      message = broadcastError.message;
    }
    if (
      typeof broadcastError === "object" &&
      broadcastError !== null &&
      "response" in broadcastError &&
      typeof broadcastError.response === "object" &&
      broadcastError.response !== null &&
      "data" in broadcastError.response
    ) {
      message = String(broadcastError.response.data);
    }
    throw new Error(`Broadcast failed: ${message}`);
  }
  const inscriptionId = `${revealTxid}i0`; // first index is the new inscription
  console.log(`Calculated Inscription ID: ${inscriptionId}`);

  try {
    console.log(`Saving mint record via Supabase: Reveal=${revealTxid}, Inscription=${inscriptionId}, Addr=${ordinalsAddress}, Commit=${commitTxid}`);

    const { data, error: dbError } = await supabaseAdmin
      .from('mint_records') // <<< Your table name here
      .insert({
        commit_txid: commitTxid,      // <<< Column names must match your DB
        reveal_txid: revealTxid,
        inscription_id: inscriptionId,
        ordinals_address: ordinalsAddress,
        // created_at will likely be handled by a DB default value
      })
      .select() // Optionally select the data back
      .single(); // If you expect only one row

    if (dbError) {
      // Throw the error to be caught by the outer handler or withErrorHandling
      throw new Error(`Supabase DB Error saving mint record: ${dbError.message}`);
    }

    console.log("Mint record saved to Supabase successfully:", data);
    // --- End of Supabase DB logic ---

  } catch (dbError: unknown) {
    console.error("Database error saving mint record post-broadcast:", dbError);
    // Log critical failure, but let the request succeed as broadcast worked.
    // You might want to implement more robust error handling/retries here.
  }
  return Response.json({
    revealTxid: revealTxid,
    inscriptionId: inscriptionId,
  });
});

