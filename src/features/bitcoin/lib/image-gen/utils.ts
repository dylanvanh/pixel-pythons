import { Buffer } from "buffer";
import crypto from "node:crypto";
import bitcoinTraits from "./bitcoin-traits.json";

export async function getSortedTraitImageFilenamesFromDirectory(directory: string) {
  const layerName = directory.split("/").at(-1) as keyof typeof bitcoinTraits;
  const traitFilenames = bitcoinTraits[layerName];

  if (!traitFilenames) {
    throw new Error(`Unknown Bitcoin trait layer: ${directory}`);
  }

  return traitFilenames;
}

export function deterministicallySelectBaseTraitIndicesAndCreateHash(
  address: string,
  sessionId: string,
  traitFileOptions: string[][],
): { indices: number[]; hash: Buffer } {
  const hash = crypto.createHash("sha256").update(`${address}:${sessionId}`).digest();
  const indices = traitFileOptions.map((options, index) =>
    options.length > 0 ? hash[index % hash.length] % options.length : 0,
  );

  return { indices, hash };
}
