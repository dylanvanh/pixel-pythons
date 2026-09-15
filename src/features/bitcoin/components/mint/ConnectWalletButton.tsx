interface ConnectWalletButtonProps {
  ordinalAddress: string | null;
  isLoading: boolean;
  startMintProcess: () => void;
  openWalletSelector: () => void;
}

export function ConnectWalletButton({
  ordinalAddress,
  isLoading,
  startMintProcess,
  openWalletSelector,
}: ConnectWalletButtonProps) {
  return (
    <button
      onClick={ordinalAddress ? startMintProcess : openWalletSelector}
      disabled={isLoading}
      className="inline-flex w-full items-center justify-center bg-black text-white border-4 border-black font-bold text-2xl py-8 hover:bg-white hover:text-black transition duration-200 shadow-[8px_8px_0px_0px_rgba(0,0,0)] disabled:pointer-events-none disabled:opacity-50"
    >
      {!ordinalAddress ? "CONNECT WALLET" : "MINT"}
    </button>
  );
}
