import { createCanvas, CanvasRenderingContext2D } from "canvas";
import path from "path";

import { IMAGE_SIZE, TRAIT_LAYERS } from "./config";
import {
  getSortedTraitImageFilenamesFromDirectory,
  deterministicallySelectBaseTraitIndicesAndCreateHash,
  drawTraitImageFileOntoCanvasContext,
} from "./utils";

export async function generateCompositeImageBuffer(
  address: string,
  sessionId: string,
): Promise<Buffer> {
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

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

  for (let i = 0; i < TRAIT_LAYERS.length; i++) {
    const layerConfig = TRAIT_LAYERS[i];
    const currentLayerTraitFiles = allTraitFileOptions[i];

    if (!currentLayerTraitFiles || currentLayerTraitFiles.length === 0) {
      continue;
    }

    const traitIndexForThisLayer = selectedTraitIndices[i];
    const selectedTraitFilename =
      currentLayerTraitFiles[traitIndexForThisLayer];

    let includeThisLayer = true;
    if (layerConfig.probability < 1) {
      // For optional layers (those with probability < 1.0):
      // This block decides if the layer should be included based on its configured probability.
      // The decision is deterministic, derived from the input hash.

      // 1. Select a unique byte from the hash for this layer's inclusion decision.
      //    Using a different part of the hash than for trait variant selection ensures these choices are independent.
      const decisionByte =
        hash[(hash.length - 1 - i + hash.length) % hash.length];

      // 2. Convert this byte into a "chance" value (0.0 to 1.0), like a deterministic dice roll.
      const appearanceChance = decisionByte / 255;

      // 3. The layer is included if this "chance" is less than its configured probability.
      //    e.g., If probability is 0.4, layer is included if appearanceChance is 0.0 up to (but not including) 0.4.
      includeThisLayer = appearanceChance < layerConfig.probability;
    }

    if (includeThisLayer) {
      if (selectedTraitFilename) {
        await drawTraitImageFileOntoCanvasContext(
          ctx,
          path.join(process.cwd(), layerConfig.dir, selectedTraitFilename),
        );
      }
    }
  }

  return canvas.toBuffer("image/png");
}
