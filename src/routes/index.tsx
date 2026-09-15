import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MintPanel } from "../components/mint/MintPanel";
import { PythonGrid } from "../components/PythonGrid";
import { getCollection } from "../lib/collection";
import { getArtPath } from "../lib/art-url";

const INITIAL_PREVIEW_TOKEN_ID = 1;
const RECENT_PYTHON_LIMIT = 5;
const PREVIEW_TOKEN_IDS = [2, 3, 4, 5, 6];

export const Route = createFileRoute("/")({
  loader: getCollection,
  component: Home,
});

function Home() {
  const collection = Route.useLoaderData();
  const [previewTokenId, setPreviewTokenId] = useState(INITIAL_PREVIEW_TOKEN_ID);
  const totalMinted = collection.status === "ready" ? collection.totalMinted : 0;
  const isPreview = collection.status === "unconfigured";
  const recentTokenCount = Math.min(totalMinted, RECENT_PYTHON_LIMIT);
  const tokenIds = isPreview
    ? PREVIEW_TOKEN_IDS
    : Array.from({ length: recentTokenCount }, (_, index) => totalMinted - index);

  return (
    <main id="main" className="home">
      <section className="intro">
        <p className="eyebrow">
          <span className="square" /> THE ROBINHOOD CHAPTER
        </p>
        <h1>
          New chain.
          <br />
          <span>Same sssoul.</span>
        </h1>
        <p>
          The Pythons are branching out. Original pixel art,
          <br className="desktop-break" /> a new home, and a Python with your name on it.
        </p>
      </section>
      <div className="mint-layout">
        <section className="preview-panel" aria-label="Artwork preview">
          <div className="preview-image">
            <img
              src={getArtPath(previewTokenId)}
              alt={`Pixel Python artwork preview #${previewTokenId}`}
              width="480"
              height="480"
              fetchPriority="high"
            />
            <span className="art-label">24 × 24. ALL PERSONALITY.</span>
          </div>
          <div className="preview-caption">
            <span>
              MEET THE PYTHONS <small>Artwork preview · not a reservation</small>
            </span>
            <button
              className="shuffle-button"
              onClick={() => setPreviewTokenId((currentTokenId) => currentTokenId + 1)}
              aria-label="Show another Python preview"
            >
              ↻
            </button>
          </div>
        </section>
        <MintPanel collection={collection} />
      </div>
      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE SNAKE PIT</p>
            <h2 id="recent-title">{isPreview ? "A few familiar faces" : "Recently minted"}</h2>
          </div>
          <Link to="/collection">
            View collection <span aria-hidden="true">↗</span>
          </Link>
        </div>
        {tokenIds.length > 0 ? (
          <PythonGrid tokenIds={tokenIds} isPreview={isPreview} />
        ) : (
          <p className="empty-state">
            {collection.status === "error"
              ? "The collection is unavailable. Try again shortly."
              : "No Pythons minted yet. The first one could be yours."}
          </p>
        )}
        {isPreview && (
          <p className="gallery-note">
            A preview of the artwork. The Robinhood collection has not opened yet.
          </p>
        )}
      </section>
      <section className="origin-note">
        <img src="/pixel-python.png" width="64" height="64" alt="Original Bitcoin Pixel Python" />
        <div>
          <h2>Bitcoin roots. Robinhood future.</h2>
          <p>Same original artwork. A separate collection on a new chain.</p>
        </div>
        <a href="/bitcoin" aria-label="Explore the Bitcoin Pixel Pythons app">
          ↗
        </a>
      </section>
    </main>
  );
}
