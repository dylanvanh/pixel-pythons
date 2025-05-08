import type { TraitLayerConfig } from './types';

export const IMAGE_SIZE = 24;

export const TRAIT_LAYER_NAME = {
  BACKGROUND: "background",
  BODY: "body",
  MOUTH: "mouth",
  EYES: "eyes",
  CLOTHES: "clothes",
  ARMS: "arms",
  HAT: "hat",
} as const;

export const TRAIT_LAYERS: TraitLayerConfig[] = [
  { name: TRAIT_LAYER_NAME.BACKGROUND, dir: "public/sneks/background", probability: 1.0 },
  { name: TRAIT_LAYER_NAME.BODY, dir: "public/sneks/body", probability: 1.0 },
  { name: TRAIT_LAYER_NAME.MOUTH, dir: "public/sneks/mouth", probability: 1.0 },
  { name: TRAIT_LAYER_NAME.EYES, dir: "public/sneks/eyes", probability: 1.0 },
  { name: TRAIT_LAYER_NAME.CLOTHES, dir: "public/sneks/clothes", probability: 0.6 },
  { name: TRAIT_LAYER_NAME.ARMS, dir: "public/sneks/arms", probability: 0.4 },
  { name: TRAIT_LAYER_NAME.HAT, dir: "public/sneks/hat", probability: 1.0 },
]; 