import { prepareRevealTx } from "@/lib/bitcoin/inscriptions/reveal-tx";
import { generateInscriptionData } from "@/lib/bitcoin/inscriptions/generate-inscription-data";

export async function POST(request: Request) {
  try {
    const {
      commitTxid,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentAddress,
      paymentPublicKey,
      feeRate,
    } = await request.json();

    const mintIndex = 2;

    if (
      !commitTxid ||
      !ordinalsAddress ||
      !ordinalsPublicKey ||
      !paymentAddress ||
      typeof mintIndex !== "number"
    ) {
      return Response.json(
        {
          error:
            "Missing required parameters (commitTxid, ordinalsAddress, ordinalsPublicKey, paymentAddress, mintIndex)",
        },
        { status: 400 },
      );
    }

    console.log("Calling shared function for reveal transaction parameters:", {
      commitTxid,
      ordinalsAddress,
      ordinalsPublicKey: ordinalsPublicKey.substring(0, 10) + "...",
      paymentAddress,
      paymentPublicKey: paymentPublicKey
        ? paymentPublicKey.substring(0, 10) + "..."
        : "N/A",
      mintIndex,
      feeRate,
    });

    const inscriptionData = await generateInscriptionData(
      ordinalsAddress,
      mintIndex,
      ordinalsPublicKey,
      feeRate,
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
