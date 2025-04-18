import { prepareCommitTx } from "@/lib/bitcoin/inscriptions/commit-tx";
import { mempoolClient } from "@/lib/external/mempool-client";

export async function POST(request: Request) {
  try {
    const {
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentPublicKey,
    } = await request.json();

    const mintIndex = 2;

    const fastFeeRate = await mempoolClient.getFastestFee();

    if (
      !paymentAddress ||
      !ordinalsAddress ||
      !ordinalsPublicKey ||
      !paymentPublicKey ||
      typeof mintIndex !== "number"
    ) {
      return Response.json(
        {
          error:
            "Missing required parameters (paymentAddress, ordinalsAddress, ordinalsPublicKey, paymentPublicKey, mintIndex)",
        },
        { status: 400 },
      );
    }

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
      taprootRevealScript: Buffer.from(
        commitResult.taprootRevealScript,
      ).toString("hex"),
      taprootRevealValue: commitResult.taprootRevealValue,
      revealFee: commitResult.revealFee,
      postage: commitResult.postage,
    });
  } catch (error) {
    console.error("Error preparing commit transaction:", error);
    return Response.json(
      {
        error: "Failed to prepare commit transaction",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
