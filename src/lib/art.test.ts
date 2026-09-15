import { expect, test, vi } from "vite-plus/test";
import { getArtSvg, getMetadata, getTraits, parseTokenId } from "./art";
import { ART_VERSION, getArtPath } from "./art-url";

test("token IDs reject invalid, noncanonical, and out-of-range input", () => {
  // given
  const invalid = ["0", "-1", "1.5", "01", "1e2", "4294967296", "Infinity", "../1", "<svg>", ""];

  // when
  const results = invalid.map(parseTokenId);

  // then
  expect(results.every((result) => result === null)).toBe(true);
  expect(parseTokenId("1")).toBe(1);
  expect(parseTokenId("4294967295")).toBe(4294967295);
});

test("art and metadata use the original layer order and reproducible traits", async () => {
  // given
  const tokenId = 1;

  // when
  const [traits, repeated, other, svg, metadata] = await Promise.all([
    getTraits(tokenId),
    getTraits(tokenId),
    getTraits(2),
    getArtSvg(tokenId),
    getMetadata(tokenId, "https://pythons.example"),
  ]);

  // then
  expect(traits).toEqual(repeated);
  expect(ART_VERSION).toBe("2");
  expect(traits.map((trait) => trait.value)).toEqual([
    "sand",
    "lavender",
    "turquoise",
    "monocle",
    "cowboy",
  ]);
  expect(other).not.toEqual(traits);
  expect(traits.map((trait) => trait.trait_type)).toEqual(
    expect.arrayContaining(["background", "body", "mouth", "eyes", "hat"]),
  );
  expect(traits[0].trait_type).toBe("background");
  expect(traits.at(-1)?.trait_type).toBe("hat");
  expect(svg.match(/<image /g)).toHaveLength(traits.length);
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).not.toContain("/public/");
  expect(metadata.image).toBe(`https://pythons.example${getArtPath(1)}`);
  expect(metadata.properties.art_version).toBe(ART_VERSION);
  expect(metadata.attributes).toEqual(
    traits.map(({ trait_type, value }) => ({ trait_type, value })),
  );
});

test("an incomplete hash bucket is rejected before selecting traits", async () => {
  // given
  const expected = await getTraits(123);
  const digest = vi.spyOn(crypto.subtle, "digest");
  digest.mockResolvedValueOnce(new Uint8Array(32).fill(255).buffer);

  try {
    // when
    const traits = await getTraits(123);

    // then
    expect(digest).toHaveBeenCalledTimes(2);
    expect(traits).not.toEqual(expected);
    expect(traits.map((trait) => trait.trait_type)).toContain("body");
  } finally {
    digest.mockRestore();
  }
});

test("the catalog is reachable and optional layers retain their intended frequency", async () => {
  // given
  const sampleSize = 4096;

  // when
  const pythons = await Promise.all(
    Array.from({ length: sampleSize }, (_, index) => getTraits(index + 1)),
  );
  const paths = new Set(pythons.flat().map((trait) => trait.path));
  const frequency = (name: string) =>
    pythons.filter((traits) => traits.some((trait) => trait.trait_type === name)).length /
    sampleSize;

  // then
  expect(paths.size).toBe(68);
  expect(frequency("clothes")).toBeGreaterThan(0.57);
  expect(frequency("clothes")).toBeLessThan(0.63);
  expect(frequency("arms")).toBeGreaterThan(0.37);
  expect(frequency("arms")).toBeLessThan(0.43);
  for (const traits of pythons) {
    expect(new Set(traits.map((trait) => trait.trait_type)).size).toBe(traits.length);
    expect(traits[0].trait_type).toBe("background");
    expect(traits.at(-1)?.trait_type).toBe("hat");
  }
});
