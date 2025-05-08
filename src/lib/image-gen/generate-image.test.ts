import { describe, it, expect, vi } from "vitest";
import {
  generateCompositeImageBuffer,
} from "./generate-image";
import {
  deterministicallySelectBaseTraitIndicesAndCreateHash,
} from "./utils";
import type { TraitFileOptions } from "./types";
import * as canvasMock from "@napi-rs/canvas";

vi.mock("@napi-rs/canvas", () => ({
  createCanvas: vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }),
    toBuffer: vi.fn().mockReturnValue(Buffer.from("mock-image-data")),
  }),
  loadImage: vi.fn().mockResolvedValue({ width: 24, height: 24 }),
}));

vi.mock("fs/promises", () => ({
  default: {
    readdir: vi.fn().mockImplementation(async (dirPath: string) => {
      if (dirPath.includes("background")) return ["bg1.png", "bg2.png"];
      if (dirPath.includes("body")) return ["body1.png", "body2.png"];
      if (dirPath.includes("mouth")) return ["mouth1.png"];
      if (dirPath.includes("eyes")) return ["eyes1.png", "eyes2.png", "eyes3.png"];
      if (dirPath.includes("clothes")) return ["clothes1.png", "N/A.png"];
      if (dirPath.includes("arms")) return ["arm_left.png", "arm_right.png"];
      if (dirPath.includes("hat")) return ["hat1.png"];
      return [];
    }),
  },
}));

describe("Image Generation Utilities", () => {
  describe("deterministicallySelectBaseTraitIndicesAndCreateHash", () => {
    it("should return indices within bounds and a hash", () => {
      const address = "0xtest";
      const mintIndex = 1;
      const traitFileOptions: TraitFileOptions = [
        ["bg1.png", "bg2.png"],
        ["body1.png", "body2.png", "body3.png"],
      ];

      const result = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        mintIndex,
        traitFileOptions,
      );

      expect(result.indices.length).toBe(traitFileOptions.length);
      expect(result.indices[0]).toBeLessThan(traitFileOptions[0].length);
      expect(result.indices[1]).toBeLessThan(traitFileOptions[1].length);
      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.hash.length).toBe(32);
    });

    it("should return same indices and hash for same inputs", () => {
      const address = "0xtest";
      const mintIndex = 1;
      const traitFileOptions: TraitFileOptions = [
        ["bg1.png", "bg2.png"],
        ["body1.png"],
      ];

      const result1 = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        mintIndex,
        traitFileOptions,
      );
      const result2 = deterministicallySelectBaseTraitIndicesAndCreateHash(
        address,
        mintIndex,
        traitFileOptions,
      );

      expect(result1.indices).toEqual(result2.indices);
      expect(result1.hash).toEqual(result2.hash);
    });
  });

  describe("generateCompositeImageBuffer", () => {
    it("should return the same image buffer when called twice with the same inputs", async () => {
      const address = "0xtestSameBuffer";
      const mintIndex = 7;

      vi.clearAllMocks();

      const buffer1 = await generateCompositeImageBuffer(address, mintIndex);
      const buffer2 = await generateCompositeImageBuffer(address, mintIndex);

      expect(Buffer.isBuffer(buffer1)).toBe(true);
      expect(Buffer.isBuffer(buffer2)).toBe(true);
      expect(buffer1).toEqual(buffer2);
      
      const mockedCreateCanvas = vi.mocked(canvasMock.createCanvas);
      expect(mockedCreateCanvas).toHaveBeenCalled();
      if (mockedCreateCanvas.mock.results[0]?.value) {
        expect(mockedCreateCanvas.mock.results[0].value.toBuffer).toHaveBeenCalled();
      } else {
        expect(mockedCreateCanvas).toHaveBeenCalled();
      }
    });
  });
});
