import { prepareCommitTx } from "@/lib/bitcoin/inscriptions/commit-tx";

export async function POST(request: Request) {
  try {
    // Get parameters from the request body
    const {
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentPublicKey,
      feeRate,
    } = await request.json();

    // Validate required parameters
    if (!paymentAddress || !ordinalsAddress || !ordinalsPublicKey || !paymentPublicKey) {
      return Response.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    console.log("Creating commit transaction with:", {
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      paymentPublicKey,
      feeRate,
    });

    // Prepare the commit transaction
    const commitResult = await prepareCommitTx(
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      {
        feeRate,
        paymentPublicKey,
      }
    );

    // Return the commit transaction data (without reveal params)
    return Response.json({
      commitPsbt: commitResult.commitPsbt,
      commitFee: commitResult.commitFee,
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