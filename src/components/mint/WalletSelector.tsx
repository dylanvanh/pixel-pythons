import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  SUPPORTED_WALLETS,
  WalletIcon,
  XVERSE,
  LEATHER,
} from "@omnisat/lasereyes";
import { useMediaQuery } from "@/hooks/use-media-query";

interface WalletSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletStatusMap: Record<string, boolean>;
  handleConnectWallet: (wallet: string) => Promise<void>;
  formatWalletName: (name: string) => string;
}

export function WalletSelector({
  open,
  onOpenChange,
  walletStatusMap,
  handleConnectWallet,
  formatWalletName,
}: WalletSelectorProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-0 pt-0 pb-0 border-t-4 border-black">
        <DrawerHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
          <DrawerTitle className="text-center text-2xl font-bold">
            Connect Wallet
          </DrawerTitle>
        </DrawerHeader>
        <WalletSelectorContent
          walletStatusMap={walletStatusMap}
          handleConnectWallet={handleConnectWallet}
          formatWalletName={formatWalletName}
        />
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-white border-4 border-black",
          "rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0)]",
          "w-[480px] max-h-[560px]",
          "flex flex-col overflow-hidden p-0",
        )}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
          <DialogTitle className="text-center text-2xl font-bold">
            Connect Wallet
          </DialogTitle>
        </DialogHeader>
        <WalletSelectorContent
          walletStatusMap={walletStatusMap}
          handleConnectWallet={handleConnectWallet}
          formatWalletName={formatWalletName}
        />
      </DialogContent>
    </Dialog>
  );
}

interface WalletSelectorContentProps {
  walletStatusMap: Record<string, boolean>;
  handleConnectWallet: (wallet: string) => Promise<void>;
  formatWalletName: (name: string) => string;
}

function WalletSelectorContent({
  walletStatusMap,
  handleConnectWallet,
  formatWalletName,
}: WalletSelectorContentProps) {
  const sortedWallets = Object.values(SUPPORTED_WALLETS)
    .filter((wallet) => wallet.name === XVERSE || wallet.name === LEATHER)
    .sort((a, b) => {
      // Ensure XVERSE is always first
      if (a.name === XVERSE) return -1;
      if (b.name === XVERSE) return 1;

      // For other wallets, maintain installation-based sort
      const aInstalled = walletStatusMap[a.name as keyof typeof walletStatusMap];
      const bInstalled = walletStatusMap[b.name as keyof typeof walletStatusMap];

      if (aInstalled && !bInstalled) return -1;
      if (!aInstalled && bInstalled) return 1;

      return 0;
    });

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedWallets.map((wallet) => {
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
                  <span className="text-lg font-bold">
                    {formatWalletName(wallet.name)}
                  </span>
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

