import { prepareCommitTx } from "@/lib/bitcoin/inscriptions/commit-tx";
import { prepareRevealTx } from "@/lib/bitcoin/inscriptions/reveal-tx";
import { calculateExpectedTxId } from "@/lib/bitcoin/core/inscription-utils";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";

export async function POST(request: Request) {
  try {
    // Get wallet addresses from the request body
    const {
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentPublicKey,
    } = await request.json();

    // Validate required parameters
    if (!paymentAddress || !ordinalsAddress || !ordinalsPublicKey) {
      return Response.json(
        { error: "Missing required wallet parameters" },
        { status: 400 },
      );
    }

    console.log("Creating inscription with:", {
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentPublicKey: paymentPublicKey,
    });

    // Prepare the commit transaction
    const commitResult = await prepareCommitTx(
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      {
        paymentPublicKey: paymentPublicKey,
      },
    );

    // Calculate expected commit txid for the reveal
    const commitPsbt = bitcoin.Psbt.fromBase64(commitResult.commitPsbt);
    const commitTxid = calculateExpectedTxId(commitPsbt);

    // Prepare the reveal transaction using the expected commit txid
    const revealResult = prepareRevealTx(
      commitTxid,
      ordinalsAddress,
      {
        taprootRevealScript: commitResult.taprootRevealScript,
        taprootRevealValue: commitResult.taprootRevealValue,
        controlBlock: commitResult.controlBlock,
        inscriptionScript: commitResult.inscriptionScript,
        postage: commitResult.postage,
      },
    );

    // Return both PSBTs and fee information
    return Response.json({
      commitPsbt: commitResult.commitPsbt,
      revealPsbt: revealResult.revealPsbt,
      commitFee: commitResult.commitFee,
      revealFee: revealResult.revealFee,
      totalFee: commitResult.commitFee + revealResult.revealFee,
      expectedInscriptionId: revealResult.expectedInscriptionId,
    });
  } catch (error) {
    console.error("Error preparing inscription PSBTs:", error);
    return Response.json(
      {
        error: "Failed to prepare inscription PSBTs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}