import { createServerFn } from "@tanstack/react-start";

export const getBitcoinCollection = createServerFn({ method: "GET" }).handler(async () => {
  const { getCollectionData } = await import("./server/collection.server");
  return getCollectionData();
});

export const getRecentBitcoinMints = createServerFn({ method: "GET" }).handler(async () => {
  const { getCollectionData } = await import("./server/collection.server");
  return getCollectionData(5);
});
