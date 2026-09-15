// Bump this before a pre-launch catalog or selection change. Freeze it at launch.
export const ART_VERSION = "2";

export function getArtPath(tokenId: number) {
  return `/api/art/${tokenId}?v=${ART_VERSION}`;
}
