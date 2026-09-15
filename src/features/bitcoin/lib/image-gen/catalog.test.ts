import { PNG } from "pngjs";
import { readFile, readdir } from "node:fs/promises";
import { expect, test } from "vite-plus/test";
import bitcoinTraits from "./bitcoin-traits.json";
import { TRAIT_LAYERS } from "./config";
import { getSortedTraitImageFilenamesFromDirectory } from "./utils";
import { createHash } from "node:crypto";
import { generateCompositeImageBuffer } from "./generate-image";

test("shared assets preserve the original Bitcoin pixels", async () => {
  // given
  // Decoded pixel hashes measured with the original canvas renderer.
  const fixtures = [
    [
      "bc1p-test",
      "migration-check-1",
      "0e803092c42b6323d780189bf35aec95fd97c3564a2ae71883166118f7819188",
    ],
    [
      "bc1p-second",
      "migration-check-2",
      "ee6666072b6119306e00558cd29104c854d90a440ad9e59fc59cc611aaeceaa8",
    ],
  ];

  for (const [address, sessionId, expectedPixelHash] of fixtures) {
    // when
    const image = await generateCompositeImageBuffer(address, sessionId);

    // then
    expect(createHash("sha256").update(PNG.sync.read(image).data).digest("hex")).toBe(
      expectedPixelHash,
    );
  }
});

test("Bitcoin selects only the original 52 traits from the shared 68-trait catalog", async () => {
  // given
  const sharedFiles = await readdir("public/sneks", { recursive: true });

  // when
  const layers = await Promise.all(
    TRAIT_LAYERS.map((layer) => getSortedTraitImageFilenamesFromDirectory(layer.dir)),
  );

  // then
  const EXPECTED_SHARED_TRAIT_COUNT = 68;
  const EXPECTED_BITCOIN_TRAIT_COUNT = 52;

  expect(sharedFiles.filter((file) => file.endsWith(".png"))).toHaveLength(
    EXPECTED_SHARED_TRAIT_COUNT,
  );
  expect(layers.flat()).toHaveLength(EXPECTED_BITCOIN_TRAIT_COUNT);
  expect(layers).toEqual(
    TRAIT_LAYERS.map(
      (layer) => bitcoinTraits[layer.dir.split("/").at(-1) as keyof typeof bitcoinTraits],
    ),
  );
  for (const [index, files] of layers.entries()) {
    for (const file of files) {
      expect((await readFile(`${TRAIT_LAYERS[index].dir}/${file}`)).length).toBeGreaterThan(0);
    }
  }
});
