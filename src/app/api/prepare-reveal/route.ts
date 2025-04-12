import { prepareRevealTx } from "@/lib/bitcoin/inscriptions/reveal-tx";
import { createRevealParams } from "@/lib/bitcoin/inscriptions/commit-tx";

export async function POST(request: Request) {
  try {
    // Get parameters from the request body
    const { commitTxid, ordinalsAddress, ordinalsPublicKey, paymentAddress, paymentPublicKey, feeRate } =
      await request.json();

    // Validate required parameters
    if (!commitTxid || !ordinalsAddress || !ordinalsPublicKey || !paymentAddress) {
      return Response.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    console.log("Creating reveal transaction with:", {
      commitTxid,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentAddress,
      paymentPublicKey,
      feeRate,
    });

    // Recreate reveal parameters from the ordinals public key
    const revealParams = createRevealParams(ordinalsPublicKey, { 
      // feeRate,
      feeRate: 3,
      paymentPublicKey 
    });

    // Prepare the reveal transaction
    const revealResult = await prepareRevealTx(
      commitTxid,
      ordinalsAddress,
      paymentAddress,
      revealParams,
    );

    // Return the reveal transaction data
    return Response.json({
      revealPsbt: revealResult.revealPsbt,
      revealFee: revealResult.revealFee,
      expectedInscriptionId: revealResult.expectedInscriptionId,
      inputSigningMap: revealResult.inputSigningMap,
    });
  } catch (error) {
    console.error("Error preparing reveal transaction:", error);
    return Response.json(
      {
        error: "Failed to prepare reveal transaction",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
