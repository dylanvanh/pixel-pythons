import { ART_VERSION, getArtPath } from "./art-url";

type TraitLayer = {
  name: string;
  present: number;
  outOf: number;
};

const MAX_TOKEN_ID = 0xffffffff;
const SHA256_HASH_BITS = 256n;
const BITS_PER_BYTE = 8n;
const TRAIT_SIZE_PIXELS = 24;
const ART_DISPLAY_SIZE_PIXELS = 480;

const traitAssets = import.meta.glob<string>("/public/sneks/*/*.png", {
  eager: true,
  query: "?inline",
  import: "default",
});
const traitLayers = [
  { name: "background", present: 1, outOf: 1 },
  { name: "body", present: 1, outOf: 1 },
  { name: "mouth", present: 1, outOf: 1 },
  { name: "eyes", present: 1, outOf: 1 },
  { name: "clothes", present: 3, outOf: 5 },
  { name: "arms", present: 2, outOf: 5 },
  { name: "hat", present: 1, outOf: 1 },
].map(loadTraitLayer);

const selectionRange = traitLayers.reduce((range, layer) => range * layer.range, 1n);
const hashRange = 1n << SHA256_HASH_BITS;
const acceptedRange = hashRange - (hashRange % selectionRange);

export function parseTokenId(value: string) {
  const tokenId = Number(value);

  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(tokenId) || tokenId > MAX_TOKEN_ID) {
    return null;
  }

  return tokenId;
}

export async function getTraits(tokenId: number) {
  if (parseTokenId(String(tokenId)) === null) {
    throw new Error("Invalid token ID");
  }

  let selection = await getTraitSelection(tokenId);

  return traitLayers.flatMap((layer) => {
    const choice = Number(selection % layer.range);
    selection /= layer.range;

    if (choice >= layer.options.length * layer.present) {
      return [];
    }

    const path = layer.options[choice % layer.options.length];
    const traitName = path.split("/").at(-1)!.replace(".png", "");

    return [{ trait_type: layer.name, value: traitName, path }];
  });
}

export async function getArtSvg(tokenId: number) {
  const traits = await getTraits(tokenId);
  const images = traits
    .map(
      ({ path }) =>
        `<image width="${TRAIT_SIZE_PIXELS}" height="${TRAIT_SIZE_PIXELS}" href="${traitAssets[path]}"/>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_DISPLAY_SIZE_PIXELS}" height="${ART_DISPLAY_SIZE_PIXELS}" viewBox="0 0 ${TRAIT_SIZE_PIXELS} ${TRAIT_SIZE_PIXELS}" style="image-rendering:pixelated"><title>Pixel Python #${tokenId}</title>${images}</svg>`;
}

export async function getMetadata(tokenId: number, origin: string) {
  const traits = await getTraits(tokenId);

  return {
    name: `Pixel Python #${tokenId}`,
    description:
      "Pixel Pythons on Robinhood Chain. Original Bitcoin artwork with new 24 × 24 pixel traits.",
    image: `${origin}${getArtPath(tokenId)}`,
    properties: { art_version: ART_VERSION },
    attributes: traits.map(({ trait_type, value }) => ({ trait_type, value })),
  };
}

function loadTraitLayer(layer: TraitLayer) {
  const options = Object.keys(traitAssets)
    .filter((path) => path.includes(`/${layer.name}/`))
    .sort();

  if (options.length === 0) {
    throw new Error(`Missing artwork layer: ${layer.name}`);
  }

  return { ...layer, options, range: BigInt(options.length * layer.outOf) };
}

async function getTraitSelection(tokenId: number) {
  // ponytail: public deterministic art; use verifiable randomness if a surprise reveal is needed.
  let selection: bigint;
  let attempt = 0;

  do {
    const seed = new TextEncoder().encode(
      `pixel-pythons-robinhood:v${ART_VERSION}:${tokenId}:${attempt}`,
    );
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", seed));

    attempt += 1;
    selection = hash.reduce((value, byte) => (value << BITS_PER_BYTE) | BigInt(byte), 0n);
    // Reject the incomplete final bucket instead of favouring its first traits.
  } while (selection >= acceptedRange);

  return selection % selectionRange;
}
