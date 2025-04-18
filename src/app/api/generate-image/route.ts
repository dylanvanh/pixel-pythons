import { NextRequest } from "next/server";
import { generateImageForMintCanvas } from "@/lib/image-gen/generateImage";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

function isErrorWithMessage(err: unknown): err is { message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { address, mintIndex } = data;
    if (!address || typeof mintIndex !== "number") {
      return new Response(
        JSON.stringify({ error: "Missing address or mintIndex" }),
        { status: 400 },
      );
    }

    // Permanent output directory
    const outputDir = path.join(process.cwd(), "public", "generated");
    await fs.mkdir(outputDir, { recursive: true });
    const outFile = path.join(outputDir, `mint_${address}_${mintIndex}.png`);

    // Generate the image and save to outFile
    await generateImageForMintCanvas(address, mintIndex, outFile);
    const imageBuffer = await fs.readFile(outFile);

    // Also save a copy to /tmp for response (optional, but not needed anymore)
    // const tmpFile = path.join('/tmp', `mint_${address}_${mintIndex}.png`);
    // await fs.copyFile(outFile, tmpFile);

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="mint_${address}_${mintIndex}.png"`,
      },
    });
  } catch (err: unknown) {
    let message = "Internal server error";
    if (isErrorWithMessage(err)) {
      message = err.message;
    }
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

// Usage: POST to /api/generate-image with JSON body { address: '...', mintIndex: 1 }
