import { createCanvas, loadImage, SKRSContext2D } from "@napi-rs/canvas";
import path from "path";

import { IMAGE_SIZE, TRAIT_LAYERS } from "./config";
import {
  getSortedTraitImageFilenamesFromDirectory,
  deterministicallySelectBaseTraitIndicesAndCreateHash,
} from "./utils";

export async function generateCompositeImageBuffer(
  address: string,
  sessionId: string,
): Promise<Buffer> {
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext("2d") as SKRSContext2D;

  const allTraitFileOptions = await Promise.all(
    TRAIT_LAYERS.map((layer) =>
      getSortedTraitImageFilenamesFromDirectory(layer.dir),
    ),
  );

  const { indices: selectedTraitIndices, hash } =
    deterministicallySelectBaseTraitIndicesAndCreateHash(
      address,
      sessionId,
      allTraitFileOptions,
    );

  for (let index = 0; index < TRAIT_LAYERS.length; index++) {
    const layerConfig = TRAIT_LAYERS[index];
    const currentLayerTraitFiles = allTraitFileOptions[index];

    if (!currentLayerTraitFiles || currentLayerTraitFiles.length === 0) {
      continue;
    }

    const selectedTraitFilename =
      currentLayerTraitFiles[selectedTraitIndices[index]];
    if (!selectedTraitFilename) continue;

    const appearanceChance = hash[hash.length - 1 - index] / 255;
    if (
      layerConfig.probability < 1 &&
      appearanceChance >= layerConfig.probability
    ) {
      continue;
    }

    const image = await loadImage(
      path.join(process.cwd(), layerConfig.dir, selectedTraitFilename),
    );
    ctx.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  }

  return canvas.toBuffer("image/png");
}
