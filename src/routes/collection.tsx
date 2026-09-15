import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PythonGrid } from "../components/PythonGrid";
import { contractAddress, explorerUrl, getCollection, type Collection } from "../lib/collection";

const COLLECTION_PAGE_SIZE = 12;

export const Route = createFileRoute("/collection")({
  loader: getCollection,
  component: CollectionPage,
});

function CollectionPage() {
  const collection = Route.useLoaderData();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(COLLECTION_PAGE_SIZE);
  const isPreview = collection.status === "unconfigured";
  const totalTokenCount = getTotalTokenCount(collection);
  const tokenIds = Array.from({ length: Math.min(totalTokenCount, visibleCount) }, (_, index) =>
    isPreview ? index + 1 : totalTokenCount - index,
  );

  return (
    <main id="main" className="collection-page">
      <div className="collection-heading">
        <div>
          <p className="eyebrow">WELCOME TO THE SNAKE PIT</p>
          <h1>
            The collection<span className="brand-dot">.</span>
          </h1>
          <p>{getCollectionDescription(collection)}</p>
        </div>
        <Link to="/" className="button secondary">
          Back to mint ↗
        </Link>
      </div>
      {explorerUrl && contractAddress && (
        <a
          className="contract-link"
          href={`${explorerUrl}/address/${contractAddress}`}
          target="_blank"
          rel="noreferrer"
        >
          View collection contract ↗
        </a>
      )}
      {collection.status === "error" && (
        <div className="empty-state" role="alert">
          <p>Could not load the collection.</p>
          <button className="button secondary" onClick={() => void router.invalidate()}>
            Try again
          </button>
        </div>
      )}
      {tokenIds.length > 0 && <PythonGrid tokenIds={tokenIds} isPreview={isPreview} />}
      {collection.status === "ready" && tokenIds.length === 0 && (
        <p className="empty-state">No Pythons minted yet. Come back when minting opens.</p>
      )}
      {totalTokenCount > visibleCount && (
        <button
          className="button secondary load-more"
          onClick={() => setVisibleCount((currentCount) => currentCount + COLLECTION_PAGE_SIZE)}
        >
          Show more Pythons
        </button>
      )}
    </main>
  );
}

function getTotalTokenCount(collection: Collection) {
  if (collection.status === "unconfigured") {
    return COLLECTION_PAGE_SIZE;
  }

  if (collection.status === "ready") {
    return collection.totalMinted;
  }

  return 0;
}

function getCollectionDescription(collection: Collection) {
  if (collection.status === "unconfigured") {
    return "Meet the artwork. These Pythons are previews, not minted tokens.";
  }

  if (collection.status === "error") {
    return "Collection data is unavailable.";
  }

  return `${collection.totalMinted.toLocaleString()} Pythons minted on this chain.`;
}
