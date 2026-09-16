import { chain, explorerUrl } from "@/lib/collection";
import type { useMintWallet } from "./_internal/use-mint-wallet";

type MintActionProps = {
  wallet: ReturnType<typeof useMintWallet>;
  canMint: boolean;
  isSoldOut: boolean;
  onConnect: () => void;
};

export function MintAction({ wallet, canMint, isSoldOut, onConnect }: MintActionProps) {
  const { isBusy, pendingTransactionHash } = wallet;

  if (pendingTransactionHash) {
    return (
      <div className="transaction-status">
        <p>Your transaction was sent. Check its result before you mint again.</p>
        {explorerUrl ? (
          <a href={`${explorerUrl}/tx/${pendingTransactionHash}`} target="_blank" rel="noreferrer">
            View transaction ↗
          </a>
        ) : (
          <code>{pendingTransactionHash}</code>
        )}
        <button
          className="button primary"
          disabled={isBusy}
          onClick={() => void wallet.confirmMint(pendingTransactionHash)}
        >
          {isBusy ? "Confirming…" : "Check confirmation"}
        </button>
      </div>
    );
  }

  if (!wallet.walletAddress) {
    return (
      <button className="button primary" disabled={isBusy} onClick={onConnect}>
        {isBusy ? "Connecting…" : "Connect wallet"}
        <span aria-hidden="true">↗</span>
      </button>
    );
  }

  if (wallet.walletChainId !== chain.id) {
    return (
      <button
        className="button primary"
        disabled={isBusy}
        onClick={() => void wallet.switchNetwork()}
      >
        {isBusy ? "Switching…" : `Switch to ${chain.name}`}
      </button>
    );
  }

  return (
    <button
      className="button primary"
      disabled={isBusy || !canMint}
      onClick={() => void wallet.mintPython()}
    >
      {getMintButtonLabel(isBusy, isSoldOut, canMint)}
      <span aria-hidden="true">↗</span>
    </button>
  );
}

function getMintButtonLabel(isBusy: boolean, isSoldOut: boolean, canMint: boolean) {
  if (isBusy) {
    return "Check your wallet…";
  }

  if (isSoldOut) {
    return "Sold out";
  }

  if (!canMint) {
    return "Mint not open";
  }

  return "Mint your Python";
}
