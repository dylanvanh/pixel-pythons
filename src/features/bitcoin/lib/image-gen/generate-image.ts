import { Buffer } from "buffer";
import { PNG } from "pngjs/browser";
import { IMAGE_SIZE, TRAIT_LAYERS } from "./config";
import {
  getSortedTraitImageFilenamesFromDirectory,
  deterministicallySelectBaseTraitIndicesAndCreateHash,
} from "./utils";

const RGBA_BYTES_PER_PIXEL = 4;
const ALPHA_CHANNEL_OFFSET = 3;
const TRANSPARENT_ALPHA = 0;
const OPAQUE_ALPHA = 255;

const traitAssets = import.meta.glob<string>("/public/sneks/*/*.png", {
  eager: true,
  query: "?inline",
  import: "default",
});

export async function generateCompositeImageBuffer(
  address: string,
  sessionId: string,
): Promise<Buffer> {
  const traitFileOptions = await Promise.all(
    TRAIT_LAYERS.map((layer) => getSortedTraitImageFilenamesFromDirectory(layer.dir)),
  );
  const { indices, hash } = deterministicallySelectBaseTraitIndicesAndCreateHash(
    address,
    sessionId,
    traitFileOptions,
  );
  const compositeImage = new PNG({ width: IMAGE_SIZE, height: IMAGE_SIZE });

  for (const [index, layer] of TRAIT_LAYERS.entries()) {
    const probabilitySample = hash[hash.length - 1 - index] / OPAQUE_ALPHA;

    if (layer.probability < 1 && probabilitySample >= layer.probability) {
      continue;
    }

    const traitPath = `/${layer.dir}/${traitFileOptions[index][indices[index]]}`;
    const traitImage = readTraitImage(traitPath);

    copyOpaquePixels(traitImage, compositeImage, traitPath);
  }

  return PNG.sync.write(compositeImage);
}

function readTraitImage(traitPath: string) {
  const traitAsset = traitAssets[traitPath];

  if (!traitAsset) {
    throw new Error(`Missing Bitcoin trait: ${traitPath}`);
  }

  const image = PNG.sync.read(Buffer.from(traitAsset.split(",")[1], "base64"));

  if (image.width !== IMAGE_SIZE || image.height !== IMAGE_SIZE) {
    throw new Error(`Invalid trait size: ${traitPath}`);
  }

  return image;
}

function copyOpaquePixels(traitImage: PNG, compositeImage: PNG, traitPath: string) {
  // ponytail: current traits use alpha 0 or 255; add source-over blending before adding translucent traits.
  for (let offset = 0; offset < traitImage.data.length; offset += RGBA_BYTES_PER_PIXEL) {
    const alpha = traitImage.data[offset + ALPHA_CHANNEL_OFFSET];

    if (alpha === TRANSPARENT_ALPHA) {
      continue;
    }

    if (alpha !== OPAQUE_ALPHA) {
      throw new Error(`Unsupported translucent trait: ${traitPath}`);
    }

    traitImage.data.copy(compositeImage.data, offset, offset, offset + RGBA_BYTES_PER_PIXEL);
  }
}
