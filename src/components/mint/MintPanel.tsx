import { useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { formatEther } from "viem";
import { chain, type Collection } from "@/lib/collection";
import { MintAction } from "./MintAction";
import { useMintWallet } from "./_internal/use-mint-wallet";

type MintPanelProps = {
  collection: Collection;
};

const ADDRESS_PREFIX_LENGTH = 6;
const ADDRESS_SUFFIX_LENGTH = 4;

export function MintPanel({ collection }: MintPanelProps) {
  const router = useRouter();
  const walletHelpDialog = useRef<HTMLDialogElement>(null);
  const wallet = useMintWallet();
  const isCollectionReady = collection.status === "ready";
  const isSoldOut = isCollectionReady && collection.totalMinted >= collection.maxSupply;
  const canMint = isCollectionReady && collection.mintOpen && !isSoldOut;

  function handleConnectWallet() {
    if (!window.ethereum) {
      walletHelpDialog.current?.showModal();
      return;
    }

    void wallet.connectWallet();
  }

  return (
    <section className="mint-panel" aria-label="Mint a Pixel Python">
      <div className="panel-heading">
        <span>YOUR NEXT PYTHON</span>
        <span className="status-tag">{chain.name}</span>
      </div>

      <div className="mint-body">
        <div className="mint-title">
          <h2>Mint a Python</h2>
          <span className="pixel-star" aria-hidden="true">
            ✳
          </span>
        </div>

        <p className="muted">A little pixel. A lot of personality.</p>

        <dl className="mint-stats">
          <div>
            <dt>Mint price</dt>
            <dd>
              {isCollectionReady
                ? `${formatEther(collection.mintPriceWei)} ETH`
                : "To be announced"}
            </dd>
          </div>
          <div>
            <dt>Minted</dt>
            <dd>
              {isCollectionReady
                ? `${collection.totalMinted.toLocaleString()} / ${collection.maxSupply.toLocaleString()}`
                : "Not open yet"}
            </dd>
          </div>
        </dl>

        {collection.status === "unconfigured" && (
          <p className="notice">
            The Robinhood collection is getting ready. Explore the artwork while you wait.
          </p>
        )}

        {collection.status === "error" && (
          <div role="alert" className="notice">
            Could not load the collection.{" "}
            <button className="text-button" onClick={() => void router.invalidate()}>
              Try again
            </button>
          </div>
        )}

        {isCollectionReady && !collection.mintOpen && !isSoldOut && (
          <p className="notice">Minting is currently closed.</p>
        )}

        {wallet.walletAddress && (
          <div className="wallet-row">
            <span title={wallet.walletAddress}>
              {wallet.walletAddress.slice(0, ADDRESS_PREFIX_LENGTH)}…
              {wallet.walletAddress.slice(-ADDRESS_SUFFIX_LENGTH)}
            </span>
            <button
              className="text-button"
              disabled={wallet.isBusy}
              onClick={wallet.disconnectWallet}
            >
              Disconnect
            </button>
          </div>
        )}

        <MintAction
          wallet={wallet}
          canMint={canMint}
          isSoldOut={isSoldOut}
          onConnect={handleConnectWallet}
        />

        <p className="mint-note">One Python per transaction. Network fees apply.</p>
        <output aria-live="polite">{wallet.statusMessage}</output>

        {wallet.errorMessage && (
          <p className="error" role="alert">
            {wallet.errorMessage}
          </p>
        )}

        {wallet.mintedTokenId && (
          <a
            className="mint-success"
            href={`/api/art/${wallet.mintedTokenId}`}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={`/api/art/${wallet.mintedTokenId}`}
              width="80"
              height="80"
              alt={`Minted Pixel Python #${wallet.mintedTokenId}`}
            />
            <strong>Meet Python #{wallet.mintedTokenId} ↗</strong>
          </a>
        )}
      </div>

      <dialog ref={walletHelpDialog} aria-labelledby="wallet-help-title">
        <form method="dialog">
          <button className="dialog-close" aria-label="Close wallet help">
            ×
          </button>
        </form>
        <h2 id="wallet-help-title">Bring your wallet</h2>
        <p>
          Open this app in an EVM wallet browser, or enable an EVM wallet extension in this browser.
        </p>
        <p>On a phone, use your wallet’s built-in browser. Then select Connect wallet again.</p>
        <a
          className="button secondary"
          href="https://docs.robinhood.com/chain/"
          target="_blank"
          rel="noreferrer"
        >
          Robinhood Chain guide ↗
        </a>
      </dialog>
    </section>
  );
}
