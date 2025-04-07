"use client";

import { useState } from "react";
import {
  LEATHER,
  MAGIC_EDEN,
  OKX,
  OYL,
  ORANGE,
  PHANTOM,
  UNISAT,
  useLaserEyes,
  WalletIcon,
  WIZZ,
  XVERSE,
  SUPPORTED_WALLETS,
} from "@omnisat/lasereyes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ConnectWallet({ className }: { className?: string }) {
  const {
    connect,
    disconnect,
    isConnecting,
    address,
    provider,
    hasUnisat,
    hasXverse,
    hasOyl,
    hasMagicEden,
    hasOkx,
    hasLeather,
    hasPhantom,
    hasWizz,
    hasOrange,
  } = useLaserEyes();
  const [isOpen, setIsOpen] = useState(false);

  const walletStatusMap = {
    [UNISAT]: hasUnisat,
    [XVERSE]: hasXverse,
    [OYL]: hasOyl,
    [MAGIC_EDEN]: hasMagicEden,
    [OKX]: hasOkx,
    [ORANGE]: hasOrange,
    [LEATHER]: hasLeather,
    [PHANTOM]: hasPhantom,
    [WIZZ]: hasWizz,
  };

  const handleConnect = async (walletName: string) => {
    if (provider === walletName) {
      disconnect();
    } else {
      setIsOpen(false);
      await connect(
        walletName as
          | typeof UNISAT
          | typeof XVERSE
          | typeof OYL
          | typeof MAGIC_EDEN
          | typeof OKX
          | typeof ORANGE
          | typeof LEATHER
          | typeof PHANTOM
          | typeof WIZZ,
      );
    }
  };

  // Format wallet name for display
  const formatWalletName = (name: string) => {
    return name
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {address ? (
        <Button
          onClick={() => disconnect()}
          className={cn(
            "bg-black text-white border-4 border-black font-bold",
            "hover:bg-white hover:text-black transition duration-200",
            "shadow-[4px_4px_0px_0px_rgba(0,0,0)]",
            className,
          )}
        >
          Disconnect
        </Button>
      ) : (
        <DialogTrigger asChild>
          <Button
            className={cn(
              "bg-black text-white border-4 border-black font-bold",
              "hover:bg-white hover:text-black transition duration-200",
              "shadow-[4px_4px_0px_0px_rgba(0,0,0)]",
              className,
            )}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        </DialogTrigger>
      )}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Object.values(SUPPORTED_WALLETS)
            .sort((a, b) => {
              const aInstalled =
                walletStatusMap[a.name as keyof typeof walletStatusMap];
              const bInstalled =
                walletStatusMap[b.name as keyof typeof walletStatusMap];

              // Sort by installation status first
              if (aInstalled && !bInstalled) return -1;
              if (!aInstalled && bInstalled) return 1;

              // If both are installed or both are not installed, keep original order
              return 0;
            })
            .map((wallet) => {
              const isInstalled =
                walletStatusMap[wallet.name as keyof typeof walletStatusMap];
              return (
                <button
                  key={wallet.name}
                  onClick={
                    isInstalled ? () => handleConnect(wallet.name) : undefined
                  }
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
                  {!isInstalled && (
                    <a
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-2 border-black px-2 py-1 rounded bg-yellow-300 hover:bg-yellow-400 font-bold text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Install
                    </a>
                  )}
                </button>
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
      </DialogContent>
    </Dialog>
  );
}
