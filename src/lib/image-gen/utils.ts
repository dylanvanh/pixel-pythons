import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { SKRSContext2D, Image, loadImage } from "@napi-rs/canvas";

import type { TraitFileOptions, TraitSelectionResults } from "./types";
import { IMAGE_SIZE } from "./config";

export async function getSortedTraitImageFilenamesFromDirectory(dir: string): Promise<string[]> {
  const files = await fs.readdir(path.join(process.cwd(), dir));
  return files.filter((file) => file.endsWith(".png")).sort();
}

/**
 * Deterministically selects indices for all layers from their respective file options
 * and generates a SHA256 hash from the address and mint index for further deterministic choices.
 */
export function deterministicallySelectBaseTraitIndicesAndCreateHash(
  address: string,
  mintIndex: number,
  traitFileOptions: TraitFileOptions,
): TraitSelectionResults {
  const uniqueString = `${address}:${mintIndex}`;
  const hash = crypto.createHash("sha256").update(uniqueString).digest();
  const indices = traitFileOptions.map((options, layerIdx) => {
    const byteForTraitChoice = hash[layerIdx % hash.length];
    return options.length > 0 ? byteForTraitChoice % options.length : 0;
  });
  return { indices, hash };
}

export async function drawTraitImageFileOntoCanvasContext(ctx: SKRSContext2D, filePath: string): Promise<void> {
  const img: Image = await loadImage(filePath);
  ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
} 