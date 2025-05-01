import { createCanvas, loadImage, SKRSContext2D, Image } from "@napi-rs/canvas";

import fs from "fs/promises";
import path from "path";
import seedrandom from "seedrandom";
import crypto from "crypto";

const TRAIT_LAYERS = [
  { name: "background", dir: "public/sneks/background" },
  { name: "body", dir: "public/sneks/body" },
  { name: "extra", dir: "public/sneks/extra" },
  { name: "eyes", dir: "public/sneks/eyes" },
  { name: "hat", dir: "public/sneks/hat" },
  { name: "tongue", dir: "public/sneks/tongue" },
];

const IMAGE_SIZE = 24;

const FIRST_SINGLE_TRAIT_LAYER_INDEX = TRAIT_LAYERS.findIndex(
  (layer) => layer.name === "eyes",
);

// This must sum 1.0
const EXTRA_PROB_TABLE = [
  { n: 1, p: 0.5 },
  { n: 2, p: 0.3 },
  { n: 3, p: 0.15 },
  { n: 4, p: 0.04 },
  { n: 5, p: 0.009 },
  { n: 6, p: 0.001 },
];

function pickNumExtras(rng: () => number): number {
  const rand = rng();
  let cumulative = 0;

  for (const { n, p } of EXTRA_PROB_TABLE) {
    cumulative += p;
    if (rand < cumulative) return n;
  }

  return 0;
}

function pickExtras(traitFiles: string[], rng: () => number): string[] {
  const numExtras = pickNumExtras(rng);
  if (numExtras === 0) return [];

  const shuffled = [...traitFiles];

  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, numExtras);
}

async function getTraitFiles(dir: string): Promise<string[]> {
  const files = await fs.readdir(path.join(process.cwd(), dir));
  return files.filter((file) => file.endsWith(".png")).sort();
}

async function drawImageOnCanvas(ctx: SKRSContext2D, filePath: string) {
  const img: Image = await loadImage(filePath);
  ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
}

export type TraitLayers = string[][];

/**
 * Deterministically select trait indices based on address and mint index.
 */
export function selectTraitIndicesForLayers(
  address: string,
  mintIndex: number,
  traitLayers: TraitLayers,
): number[] {
  const uniqueStr = `${address}:${mintIndex}`;
  const hash = crypto.createHash("sha256").update(uniqueStr).digest();
  return traitLayers.map((options, layerIdx) => {
    const byte = hash[layerIdx % hash.length];
    return byte % options.length;
  });
}

/**
 * Generate a composite image buffer for a given address and mint index.
 */
export async function generateImageBufferForMint(
  address: string,
  mintIndex: number,
): Promise<Buffer> {
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext("2d") as SKRSContext2D;
  const rng = seedrandom(`${address}:${mintIndex}`);

  // Load all trait options for each layer
  const traitOptions = await Promise.all(
    TRAIT_LAYERS.map((layer) => getTraitFiles(layer.dir)),
  );

  // Select trait indices for all layers
  const indices = selectTraitIndicesForLayers(address, mintIndex, traitOptions);

  // Draw background layer
  await drawImageOnCanvas(
    ctx,
    path.join(process.cwd(), TRAIT_LAYERS[0].dir, traitOptions[0][indices[0]]),
  );

  // Draw body layer
  await drawImageOnCanvas(
    ctx,
    path.join(process.cwd(), TRAIT_LAYERS[1].dir, traitOptions[1][indices[1]]),
  );

  // Handle special case for extras (multiple traits possible)
  const extraLayerIndex = 2;
  const selectedExtras = pickExtras(traitOptions[extraLayerIndex], rng);

  for (const extraFile of selectedExtras) {
    await drawImageOnCanvas(
      ctx,
      path.join(process.cwd(), TRAIT_LAYERS[extraLayerIndex].dir, extraFile),
    );
  }

  // Draw remaining single-trait layers (eyes, hat, tongue)
  for (
    let layerIndex = FIRST_SINGLE_TRAIT_LAYER_INDEX;
    layerIndex < TRAIT_LAYERS.length;
    layerIndex++
  ) {
    const traitFile = traitOptions[layerIndex][indices[layerIndex]];

    if (traitFile && traitFile !== "N/A") {
      await drawImageOnCanvas(
        ctx,
        path.join(process.cwd(), TRAIT_LAYERS[layerIndex].dir, traitFile),
      );
    }
  }

  return canvas.toBuffer("image/png");
}
