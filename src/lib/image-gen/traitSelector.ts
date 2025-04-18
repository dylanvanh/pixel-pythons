import crypto from "crypto";

export type TraitLayers = string[][];

/**
 * Deterministically select trait indices based on address and mint index.
 * @param address Ordinals address of the minter
 * @param mintIndex The index of the mint (e.g., 1 for first minted)
 * @param traitLayers Array of trait option arrays, one per layer
 * @returns Array of selected indices, one per layer
 */
export function getTraitIndices(
  address: string,
  mintIndex: number,
  traitLayers: TraitLayers,
): number[] {
  const uniqueStr = `${address}:${mintIndex}`;
  const hash = crypto.createHash("sha256").update(uniqueStr).digest();
  return traitLayers.map((options, i) => {
    const byte = hash[i % hash.length];
    return byte % options.length;
  });
}

