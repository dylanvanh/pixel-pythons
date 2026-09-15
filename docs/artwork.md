# Artwork and selection

The catalog has 68 ready-to-use PNG traits. All 52 Bitcoin PNGs are unchanged. The 16 additions use the original 24 × 24 grid. Asset-generation tools are not part of the app and are not required for a build.

| Layer      | New traits                                        | Total | Appearance |
| ---------- | ------------------------------------------------- | ----: | ---------: |
| Background | Mint, sand                                        |     8 |     Always |
| Body       | Teal, lavender                                    |     6 |     Always |
| Mouth      | Fangs, grin                                       |     8 |     Always |
| Eyes       | Gold stars, aqua visor                            |    13 |     Always |
| Clothes    | Leaf cloak, puffer vest                           |     8 |        60% |
| Arms       | Woodland bow, coffee                              |     7 |        40% |
| Hat        | Forest feather, rain bucket, knit beanie, antenna |    18 |     Always |

New bodies use the exact original silhouette. Hats stay above the eyes. The bow and coffee cup sit to the left to leave room for the original tongues and cigarettes on the right.

## Formula

The old selector used one byte per layer and `byte % traitCount`. When the count does not divide 256, some traits get more possible byte values than others. It also rebuilt and sorted the same file lists for each request.

Version 2 builds the sorted catalog once and uses the entire SHA-256 hash of `pixel-pythons-robinhood:v2:TOKEN_ID:ATTEMPT`. It rejects the incomplete final bucket, then uses division and remainder to choose one weighted slot per layer. Each trait in a layer has equal weight. Clothing traits each occupy three slots out of five per option; arm traits occupy two. The remaining slots omit that layer. This gives the intended 60% and 40% rates without the old 8-bit rounding. Typical generation takes one hash.

The hash is deterministic and public. This is not secure mint randomness and does not guarantee unique trait combinations. No trait has a custom rarity weight.

## Rendering

The SVG embeds the original-size PNG layers in background, body, mouth, eyes, clothes, arms, hat order. Its 24 × 24 view box scales to a 480 × 480 image. The SVG and page images both use `image-rendering: pixelated`, so embedded raster layers and the final image use pixel scaling. See [MDN's image-rendering reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering).

Every new pixel is either fully opaque or fully transparent. There is no resampling, antialiasing, or generated blur. The app needs no new rendering dependency.

## Edit and verify

Edit the PNG files in `public/sneks` with a pixel editor. Keep the 24 × 24 canvas, layer positions, and transparency. Do not resize with smoothing.

```sh
vp test run
vp check
vp build
vp run local:test
```

Tests check PNG dimensions, checksums, scanline data, deterministic selection, rejection of an incomplete hash bucket, and a 4,096-token sample. The sample must reach every trait and retain the optional-layer frequencies.

## Before launch

Version 2 changes existing previews and locally minted test-token art. No public collection has been deployed. Both page images and metadata now use the shared `?v=2` image URL, which prevents browsers from reusing the earlier artwork URL. Metadata also records `properties.art_version`.

The query parameter is a cache key; the API does not preserve earlier generators. Before public minting, freeze the version, sorted catalog, PNG files, formula, and metadata host. Adding or renaming a file changes token art. Do not change a live collection this way; a later collection needs a separate fixed catalog and metadata path.
