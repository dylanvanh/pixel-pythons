import type { Buffer } from 'buffer'; // Node.js Buffer if not globally available in context

export type TraitLayerConfig = {
  name: string;
  dir: string;
  probability: number; // 0-1 -> 1 is 100%
};

export type TraitFileOptions = string[][];

export type TraitSelectionResults = {
  indices: number[];
  hash: Buffer;
};

export type GeneratedImageData = {
  imageBuffer: Buffer;
}; 