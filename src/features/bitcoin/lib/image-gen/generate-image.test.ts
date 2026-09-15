import { describe, it, expect } from "vite-plus/test";
import { generateCompositeImageBuffer } from "./generate-image";
import { deterministicallySelectBaseTraitIndicesAndCreateHash } from "./utils";

describe("Image Generation Utilities", () => {
  describe("deterministicallySelectBaseTraitIndicesAndCreateHash", () => {
    it("should return indices within bounds and a hash", () => {
      // given
      const address = "0xtest";
      const sessionId = "1234567890abcdef1234567890abcdef";
      const traitFileOptions: string[][] = [
        ["bg1.png", "bg2.png"],
        ["body1.png", "body2.png", "body3.png"],
      ];

      // when
      const result = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        sessionId,
        traitFileOptions,
      );

      // then
      const EXPECTED_SHA256_LENGTH_BYTES = 32;

      expect(result.indices.length).toBe(traitFileOptions.length);
      expect(result.indices[0]).toBeLessThan(traitFileOptions[0].length);
      expect(result.indices[1]).toBeLessThan(traitFileOptions[1].length);
      expect(result.hash.length).toBe(EXPECTED_SHA256_LENGTH_BYTES);
    });

    it("should return same indices and hash for same inputs", () => {
      // given
      const address = "0xtest";
      const sessionId = "1234567890abcdef1234567890abcdef";
      const traitFileOptions: string[][] = [["bg1.png", "bg2.png"], ["body1.png"]];

      // when
      const firstSelection = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        sessionId,
        traitFileOptions,
      );
      const repeatedSelection = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        sessionId,
        traitFileOptions,
      );

      // then
      expect(firstSelection.indices).toEqual(repeatedSelection.indices);
      expect(firstSelection.hash).toEqual(repeatedSelection.hash);
    });
  });

  describe("generateCompositeImageBuffer", () => {
    it("should return the same image buffer when called twice with the same inputs", async () => {
      // given
      const address = "0xtestSameBuffer";
      const sessionId = "abcdef1234567890abcdef1234567890";

      // when
      const firstImage = await generateCompositeImageBuffer(address, sessionId);
      const repeatedImage = await generateCompositeImageBuffer(address, sessionId);

      // then
      expect(firstImage).toEqual(repeatedImage);
    });
  });
});
