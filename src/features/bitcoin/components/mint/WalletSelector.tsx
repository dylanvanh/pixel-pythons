import { cn } from "@/features/bitcoin/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/bitcoin/components/ui/dialog";
import { SUPPORTED_WALLETS, WalletIcon, XVERSE, LEATHER } from "@omnisat/lasereyes";

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletStatusMap: Record<string, boolean>;
  handleConnectWallet: (wallet: string) => Promise<void>;
}

export function WalletSelector({
  open,
  onOpenChange,
  walletStatusMap,
  handleConnectWallet,
}: WalletSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[560px] w-[480px] flex-col overflow-hidden border-4 border-black rounded-lg p-0 shadow-[8px_8px_0px_0px_rgba(0,0,0)] max-md:top-auto max-md:bottom-0 max-md:w-full max-md:max-w-none max-md:translate-y-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
          <DialogTitle className="text-center text-2xl font-bold">Connect Wallet</DialogTitle>
        </DialogHeader>
        <WalletSelectorContent
          walletStatusMap={walletStatusMap}
          handleConnectWallet={handleConnectWallet}
        />
      </DialogContent>
    </Dialog>
  );
}

interface WalletSelectorContentProps {
  walletStatusMap: Record<string, boolean>;
  handleConnectWallet: (wallet: string) => Promise<void>;
}

function WalletSelectorContent({
  walletStatusMap,
  handleConnectWallet,
}: WalletSelectorContentProps) {
  const supportedWallets = Object.values(SUPPORTED_WALLETS);
  const wallets = [XVERSE, LEATHER].flatMap((walletName) => {
    const wallet = supportedWallets.find(({ name }) => name === walletName);
    return wallet ? [wallet] : [];
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {wallets.map((wallet) => {
          const isInstalled = walletStatusMap[wallet.name as keyof typeof walletStatusMap];

          return (
            <div key={wallet.name} className="relative">
              <button
                onClick={isInstalled ? () => handleConnectWallet(wallet.name) : undefined}
                className={cn(
                  "w-full bg-white py-3 px-4 flex items-center justify-between",
                  "border-4 border-black rounded-lg",
                  "transition-all duration-200",
                  isInstalled
                    ? "hover:bg-blue-300 hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0)]"
                    : "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center gap-3">
                  <WalletIcon walletName={wallet.name} size={32} />
                  <span className="text-lg font-bold capitalize">{wallet.name}</span>
                </div>
                {!isInstalled && <div className="w-[70px]"></div>}
              </button>

              {!isInstalled && (
                <div className="absolute top-0 right-0 h-full flex items-center pr-4">
                  <a
                    href={wallet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-black px-2 py-1 rounded bg-yellow-300 hover:bg-yellow-400 font-bold text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full bg-blue-400 p-4 border-t-4 border-black text-center font-bold">
        <a
          href="https://www.lasereyes.build/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Powered by LaserEyes
        </a>
      </div>
    </>
  );
}
