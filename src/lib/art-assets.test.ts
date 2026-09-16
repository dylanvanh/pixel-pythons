import { readFileSync, readdirSync } from "node:fs";
import { crc32, inflateSync } from "node:zlib";
import { expect, test } from "vite-plus/test";

const PNG_SIGNATURE_BYTES = 8;
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;
const PNG_BIT_DEPTH_OFFSET = 24;
const PNG_COLOR_TYPE_OFFSET = 25;
const CHUNK_LENGTH_BYTES = 4;
const CHUNK_TYPE_BYTES = 4;
const CHUNK_HEADER_BYTES = CHUNK_LENGTH_BYTES + CHUNK_TYPE_BYTES;
const CHUNK_CHECKSUM_BYTES = 4;
const CHUNK_OVERHEAD_BYTES = CHUNK_HEADER_BYTES + CHUNK_CHECKSUM_BYTES;
const RGBA_BYTES_PER_PIXEL = 4;
const ROW_FILTER_BYTES = 1;

test("the shipped PNG catalog fits the original grid and contains valid pixel data", () => {
  // given
  const artworkDirectory = new URL("../../public/sneks/", import.meta.url);
  const traitFiles = readdirSync(artworkDirectory, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".png"),
  );

  // when
  const images = traitFiles.map((file) => readFileSync(new URL(file, artworkDirectory)));

  // then
  const EXPECTED_TRAIT_COUNT = 68;
  const EXPECTED_IMAGE_SIZE_PIXELS = 24;
  const EXPECTED_PNG_SIGNATURE = "89504e470d0a1a0a";
  const EXPECTED_BIT_DEPTH = 8;
  const EXPECTED_RGBA_COLOR_TYPE = 6;
  const EXPECTED_MAX_FILTER_TYPE = 4;
  const EXPECTED_ROW_BYTES = EXPECTED_IMAGE_SIZE_PIXELS * RGBA_BYTES_PER_PIXEL + ROW_FILTER_BYTES;

  expect(traitFiles).toHaveLength(EXPECTED_TRAIT_COUNT);

  for (const image of images) {
    expect(image.subarray(0, PNG_SIGNATURE_BYTES).toString("hex")).toBe(EXPECTED_PNG_SIGNATURE);
    expect(image.readUInt32BE(PNG_WIDTH_OFFSET)).toBe(EXPECTED_IMAGE_SIZE_PIXELS);
    expect(image.readUInt32BE(PNG_HEIGHT_OFFSET)).toBe(EXPECTED_IMAGE_SIZE_PIXELS);
    expect(image[PNG_BIT_DEPTH_OFFSET]).toBe(EXPECTED_BIT_DEPTH);
    expect(image[PNG_COLOR_TYPE_OFFSET]).toBe(EXPECTED_RGBA_COLOR_TYPE);

    const compressedPixelChunks: Buffer[] = [];

    for (let offset = PNG_SIGNATURE_BYTES; offset < image.length;) {
      const chunkLength = image.readUInt32BE(offset);
      const checksumOffset = offset + CHUNK_HEADER_BYTES + chunkLength;
      const chunkContent = image.subarray(offset + CHUNK_LENGTH_BYTES, checksumOffset);
      const chunkType = chunkContent.subarray(0, CHUNK_TYPE_BYTES).toString();

      expect(crc32(chunkContent)).toBe(image.readUInt32BE(checksumOffset));

      if (chunkType === "IDAT") {
        compressedPixelChunks.push(chunkContent.subarray(CHUNK_TYPE_BYTES));
      }

      offset += CHUNK_OVERHEAD_BYTES + chunkLength;
    }

    const pixels = inflateSync(Buffer.concat(compressedPixelChunks));

    expect(pixels).toHaveLength(EXPECTED_IMAGE_SIZE_PIXELS * EXPECTED_ROW_BYTES);

    for (let row = 0; row < EXPECTED_IMAGE_SIZE_PIXELS; row++) {
      expect(pixels[row * EXPECTED_ROW_BYTES]).toBeLessThanOrEqual(EXPECTED_MAX_FILTER_TYPE);
    }
  }
});
