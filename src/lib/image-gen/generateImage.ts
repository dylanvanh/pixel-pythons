import { createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import { getTraitIndices } from "./traitSelector";

const TRAIT_LAYERS = [
  { name: "background", dir: "public/layers/background" },
  { name: "punks", dir: "public/layers/trait_types/punks" },
  { name: "top", dir: "public/layers/trait_types/top" },
  { name: "mouth", dir: "public/layers/trait_types/mouth" },
  { name: "glasses", dir: "public/layers/trait_types/glasses" },
  { name: "chain", dir: "public/layers/trait_types/chain" },
  { name: "cheek", dir: "public/layers/trait_types/cheek" },
  { name: "beard", dir: "public/layers/trait_types/beard" },
];

const imageFormat = { width: 24, height: 24 };

/**
 * Generate a composite image buffer for a given address and mint index.
 * @param address Ordinals address
 * @param mintIndex Mint index
 * @returns Promise<Buffer> The generated image as a PNG buffer.
 */
export async function generateImageBufferForMint(
  address: string,
  mintIndex: number,
): Promise<Buffer> {
  const canvas = createCanvas(imageFormat.width, imageFormat.height);
  const ctx = canvas.getContext("2d");

  const traitOptionsPromises = TRAIT_LAYERS.map((layer) =>
    fs
      .readdir(layer.dir)
      .then((files) => files.filter((f) => f.endsWith(".png")).sort()),
  );
  const resolvedTraitOptions = await Promise.all(traitOptionsPromises);

  const indices = getTraitIndices(address, mintIndex, resolvedTraitOptions);

  // Draw background first
  const bgPath = path.join(
    TRAIT_LAYERS[0].dir,
    resolvedTraitOptions[0][indices[0]],
  );
  const bgImg = await loadImage(bgPath);
  ctx.drawImage(bgImg, 0, 0, imageFormat.width, imageFormat.height);

  // Draw each trait layer in order (skip background, already drawn)
  for (let i = 1; i < TRAIT_LAYERS.length; i++) {
    const traitFile = resolvedTraitOptions[i][indices[i]];
    if (traitFile && traitFile !== "N/A") {
      const traitPath = path.join(TRAIT_LAYERS[i].dir, traitFile);
      const traitImg = await loadImage(traitPath);
      ctx.drawImage(traitImg, 0, 0, imageFormat.width, imageFormat.height);
    }
  }

  return canvas.toBuffer("image/png");
}
