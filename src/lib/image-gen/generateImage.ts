import { createCanvas, loadImage, SKRSContext2D, Image } from "@napi-rs/canvas";

import fs from "fs/promises";
import path from "path";
import seedrandom from "seedrandom";
import crypto from "crypto";

export const TRAIT_LAYER_NAME = {
  BACKGROUND: "background",
  BODY: "body",
  EXTRA: "extra",
  EYES: "eyes",
  HAT: "hat",
  TONGUE: "tongue",
} as const;

const TRAIT_LAYERS = [
  { name: TRAIT_LAYER_NAME.BACKGROUND, dir: "public/sneks/background" },
  { name: TRAIT_LAYER_NAME.BODY, dir: "public/sneks/body" },
  { name: TRAIT_LAYER_NAME.EXTRA, dir: "public/sneks/extra" },
  { name: TRAIT_LAYER_NAME.EYES, dir: "public/sneks/eyes" },
  { name: TRAIT_LAYER_NAME.HAT, dir: "public/sneks/hat" },
  { name: TRAIT_LAYER_NAME.TONGUE, dir: "public/sneks/tongue" },
];

const IMAGE_SIZE = 24;

// This must sum 1.0
const EXTRA_PROB_TABLE = [
  { numExtras: 1, probability: 0.5 },
  { numExtras: 2, probability: 0.3 },
  { numExtras: 3, probability: 0.15 },
  { numExtras: 4, probability: 0.04 },
  { numExtras: 5, probability: 0.009 },
  { numExtras: 6, probability: 0.001 },
];

function pickNumExtras(rng: () => number): number {
  const rand = rng();
  let cumulative = 0;

  for (const { numExtras, probability } of EXTRA_PROB_TABLE) {
    cumulative += probability;
    if (rand < cumulative) return numExtras;
  }

  return 0;
}

function pickExtras(traitFiles: string[], rng: () => number): string[] {
  const numExtrasToPick = pickNumExtras(rng);
  if (numExtrasToPick === 0) return [];

  const shuffledTraitFiles = [...traitFiles];

  // Fisher Yates Shuffle to ensure random, unbiased selection of extras
  for (
    let currentIndex = shuffledTraitFiles.length - 1;
    currentIndex > 0;
    currentIndex--
  ) {
    const randomIndex = Math.floor(rng() * (currentIndex + 1));
    [shuffledTraitFiles[currentIndex], shuffledTraitFiles[randomIndex]] = [
      shuffledTraitFiles[randomIndex],
      shuffledTraitFiles[currentIndex],
    ];
  }

  return shuffledTraitFiles.slice(0, numExtrasToPick);
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

  // Draw all single-trait layers
  for (let layerIndex = 0; layerIndex < TRAIT_LAYERS.length; layerIndex++) {
    if (TRAIT_LAYERS[layerIndex].name === TRAIT_LAYER_NAME.EXTRA) continue;
    const traitFile = traitOptions[layerIndex][indices[layerIndex]];
    if (traitFile && traitFile !== "N/A") {
      await drawImageOnCanvas(
        ctx,
        path.join(process.cwd(), TRAIT_LAYERS[layerIndex].dir, traitFile),
      );
    }
  }

  // Draw extras (multiple traits possible)
  const extraLayerIndex = TRAIT_LAYERS.findIndex(
    (layer) => layer.name === TRAIT_LAYER_NAME.EXTRA,
  );
  const selectedExtras = pickExtras(traitOptions[extraLayerIndex], rng);
  for (const extraFile of selectedExtras) {
    await drawImageOnCanvas(
      ctx,
      path.join(process.cwd(), TRAIT_LAYERS[extraLayerIndex].dir, extraFile),
    );
  }

  return canvas.toBuffer("image/png"); 
}
