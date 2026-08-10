import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function getSortedTraitImageFilenamesFromDirectory(
  dir: string,
): Promise<string[]> {
  const files = await fs.readdir(path.join(process.cwd(), dir));
  return files.filter((file) => file.endsWith(".png")).sort();
}

/**
 * Deterministically selects indices for all layers from their respective file options
 * and generates a SHA256 hash from the address and session ID for further deterministic choices.
 */
export function deterministicallySelectBaseTraitIndicesAndCreateHash(
  address: string,
  sessionId: string,
  traitFileOptions: string[][],
): { indices: number[]; hash: Buffer } {
  const uniqueString = `${address}:${sessionId}`;
  const hash = crypto.createHash("sha256").update(uniqueString).digest();
  const indices = traitFileOptions.map((options, layerIdx) => {
    const byteForTraitChoice = hash[layerIdx % hash.length];
    return options.length > 0 ? byteForTraitChoice % options.length : 0;
  });
  return { indices, hash };
}
