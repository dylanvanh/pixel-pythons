import { useRef } from "react";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { chain } from "../lib/collection";
import stylesheet from "../styles.css?url";
import chainStyles from "../chain-nav.css?url";
import bitcoinStyles from "../features/bitcoin/styles.css?url";
import { ChainNav } from "../components/ChainNav";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pixel Pythons · Robinhood Chain" },
      {
        name: "description",
        content:
          "Meet Pixel Pythons on Robinhood Chain. Explore the original pixel artwork and mint your own Python.",
      },
    ],
    links: [
      { rel: "stylesheet", href: chainStyles },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <main id="main" className="empty-page">
      <h1>This Python got lost.</h1>
      <p>That page does not exist.</p>
      <Link className="button secondary" to="/">
        Back to mint
      </Link>
    </main>
  ),
  errorComponent: ({ reset }) => (
    <main id="main" className="empty-page">
      <h1>Something went wrong.</h1>
      <p>Could not load this page.</p>
      <button className="button secondary" onClick={reset}>
        Try again
      </button>
    </main>
  ),
});

function Root() {
  const aboutDialog = useRef<HTMLDialogElement>(null);
  const isBitcoin = useRouterState({
    select: (state) =>
      state.location.pathname === "/bitcoin" || state.location.pathname.startsWith("/bitcoin/"),
  });

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <link
          key={isBitcoin ? "bitcoin" : "robinhood"}
          rel="stylesheet"
          href={isBitcoin ? bitcoinStyles : stylesheet}
        />
      </head>
      <body className={isBitcoin ? "bitcoin-app" : undefined}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {isBitcoin ? (
          <>
            <ChainNav current="bitcoin" />
            <Outlet />
          </>
        ) : (
          <>
            <div className="network-strip">
              BORN ON BITCOIN <span aria-hidden="true">/</span> A NEW HOME ON ROBINHOOD CHAIN
            </div>
            <ChainNav current="robinhood" />
            <header className="site-header">
              <Link to="/" className="brand" aria-label="Pixel Pythons home">
                <img src="/pixel-python.png" width="44" height="44" alt="" />
                <span>
                  PIXEL
                  <br />
                  PYTHONS<span className="brand-dot">.</span>
                </span>
              </Link>
              <nav aria-label="Main navigation">
                <Link to="/" activeProps={{ className: "active" }} activeOptions={{ exact: true }}>
                  Mint
                </Link>
                <Link to="/collection" activeProps={{ className: "active" }}>
                  Collection
                </Link>
              </nav>
            </header>
            <Outlet />
            <footer className="site-footer">
              <span>SMALL PIXELS. BIG PERSONALITY.</span>
              <div>
                <span>{chain.name}</span>
                <button className="text-button" onClick={() => aboutDialog.current?.showModal()}>
                  About & risks
                </button>
              </div>
            </footer>
            <dialog ref={aboutDialog} aria-labelledby="about-title">
              <form method="dialog">
                <button className="dialog-close" aria-label="Close about dialog">
                  ×
                </button>
              </form>
              <h2 id="about-title">Same Pythons. New home.</h2>
              <p>
                This independent collection uses the original Pixel Pythons artwork. It is not
                affiliated with Robinhood.
              </p>
              <p>
                Preview images are examples, not proof of ownership. A mint is complete only after a
                successful contract transaction. Blockchain transactions cannot be undone. Check the
                network, price, and wallet request before signing.
              </p>
              <p>
                Art is generated from the token ID and is visible before minting. A preview does not
                reserve a token.
              </p>
            </dialog>
          </>
        )}
        <Scripts />
      </body>
    </html>
  );
}
