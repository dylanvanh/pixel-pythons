import { prepareInscriptionPsbts } from "@/lib/bitcoin/prepare-psbts";

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

    // Use the provided wallet addresses
    const response = await prepareInscriptionPsbts(
      paymentAddress,
      ordinalsAddress,
      ordinalsPublicKey,
      {
        paymentPublicKey: paymentPublicKey,
      },
    );

    return Response.json(response);
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