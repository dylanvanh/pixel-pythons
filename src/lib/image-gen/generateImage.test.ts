import { describe, it, expect, vi } from "vitest";
import {
  generateImageBufferForMint,
  selectTraitIndicesForLayers,
  TraitLayers,
} from "./generateImage";

vi.mock("@napi-rs/canvas", () => ({
  createCanvas: vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
    toBuffer: vi.fn().mockReturnValue(Buffer.from("mock-image-data")),
  }),
  loadImage: vi.fn().mockResolvedValue({}),
}));

describe("Image Generation Module", () => {
  describe("selectTraitIndicesForLayers", () => {
    it("should return indices within bounds", () => {
      const address = "0xtest";
      const mintIndex = 1;
      const traitLayers: TraitLayers = [
        ["bg1.png", "bg2.png"],
        ["body1.png", "body2.png"],
      ];

      const result = selectTraitIndicesForLayers(
        address,
        mintIndex,
        traitLayers,
      );

      expect(result.length).toBe(traitLayers.length);
      expect(result[0]).toBeLessThan(traitLayers[0].length);
      expect(result[1]).toBeLessThan(traitLayers[1].length);
    });

    it("should return same indices for same inputs", () => {
      const address = "0xtest";
      const mintIndex = 1;
      const traitLayers: TraitLayers = [
        ["bg1.png", "bg2.png"],
        ["body1.png", "body2.png"],
      ];

      const result1 = selectTraitIndicesForLayers(
        address,
        mintIndex,
        traitLayers,
      );
      const result2 = selectTraitIndicesForLayers(
        address,
        mintIndex,
        traitLayers,
      );

      expect(result1).toEqual(result2);
    });
  });

  describe("generateImageBufferForMint", () => {
    it("should return the same image when called twice with the same inputs", async () => {
      const address = "0xtest";
      const mintIndex = 1;

      // First call
      const buffer1 = await generateImageBufferForMint(address, mintIndex);

      // Second call with same parameters
      const buffer2 = await generateImageBufferForMint(address, mintIndex);

      // Verify both calls return identical results
      expect(buffer1).toEqual(buffer2);
    });
  });
});

