import { createCanvas, loadImage } from "canvas";
import fs from "fs/promises";
import path from "path";
import { getTraitIndices } from "./traitSelector";

// If you see a type error for 'sharp', run: npm install sharp @types/sharp

// Define the trait order and corresponding directories
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
const outputDir = path.join(process.cwd(), "public", "generated");

/**
 * Generate a composite image for a given address and mint index.
 * @param address Ordinals address
 * @param mintIndex Mint index
 * @param outputPath Path to save the generated PNG
 */
export async function generateImageForMintCanvas(
  address: string,
  mintIndex: number,
  outputPath: string,
): Promise<void> {
  const canvas = createCanvas(imageFormat.width, imageFormat.height);
  const ctx = canvas.getContext("2d");

  // Get trait options for each layer
  const traitOptions = TRAIT_LAYERS.map((layer) =>
    fs
      .readdir(layer.dir)
      .then((files) => files.filter((f) => f.endsWith(".png")).sort()),
  );
  const resolvedTraitOptions = await Promise.all(traitOptions);

  // Use your deterministic trait selection function
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

  // Save the image
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, canvas.toBuffer("image/png"));
}
