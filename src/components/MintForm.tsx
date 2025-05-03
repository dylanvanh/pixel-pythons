"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useMintStore } from "@/store/mint-store";
import {
  useLaserEyes,
  UNISAT,
  XVERSE,
  OYL,
  MAGIC_EDEN,
  OKX,
  ORANGE,
  LEATHER,
  PHANTOM,
  WIZZ,
  SUPPORTED_WALLETS,
  WalletIcon,
} from "@omnisat/lasereyes";
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
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";

export function MintForm() {
  const mintStep = useMintStore((state) => state.mintStep);
  const isLoading = useMintStore((state) => state.isLoading);
  const transactions = useMintStore((state) => state.transactions);
  const startMintProcess = useMintStore((state) => state.startMintProcess);
  const signCommitTransaction = useMintStore(
    (state) => state.signCommitTransaction,
  );
  const signRevealTransaction = useMintStore(
    (state) => state.signRevealTransaction,
  );
  const resetMintProcess = useMintStore((state) => state.resetMintProcess);
  const setWalletProvider = useMintStore((state) => state.setWalletProvider);

  // State for wallet dialog/drawer
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const {
    address: ordinalAddress,
    paymentAddress,
    signPsbt: laserEyesSignPsbt,
    publicKey,
    paymentPublicKey,
    connect,
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

  // Wallet status mapping
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

  // Format wallet name for display
  const formatWalletName = (name: string) => {
    return name
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Handle wallet connection
  const handleConnectWallet = async (walletName: string) => {
    setWalletSelectorOpen(false);
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
  };

  const signPsbtWrapper = useCallback(
    async (
      options:
        | {
            tx: string;
            finalize?: boolean;
            broadcast?: boolean;
            inputsToSign: { index: number; address: string }[];
          }
        | string,
      finalize?: boolean,
      broadcast?: boolean,
    ): Promise<{ psbt?: string; txId?: string }> => {
      if (typeof options === "string") {
        const response = await laserEyesSignPsbt(options, finalize, broadcast);
        return {
          psbt: response?.signedPsbtBase64,
          txId: response?.txId,
        };
      }

      // When options is passed as an object, ensure finalize and broadcast are forwarded
      const objOptions = options as {
        tx: string;
        finalize?: boolean;
        broadcast?: boolean;
        inputsToSign: { index: number; address: string }[];
      };

      // Make sure we pass through the finalize and broadcast flags that were provided
      const response = await laserEyesSignPsbt({
        ...objOptions,
        finalize:
          objOptions.finalize !== undefined ? objOptions.finalize : finalize,
        broadcast:
          objOptions.broadcast !== undefined ? objOptions.broadcast : broadcast,
      });

      return {
        psbt: response?.signedPsbtHex
          ? bitcoin.Psbt.fromHex(response.signedPsbtHex).toBase64()
          : response?.signedPsbtBase64,
        txId: response?.txId,
      };
    },
    [laserEyesSignPsbt],
  );

  // Initialize wallet when addresses are available
  useEffect(() => {
    if (ordinalAddress && paymentAddress) {
      setWalletProvider({
        ordinalAddress,
        paymentAddress,
        signPsbt: signPsbtWrapper,
        publicKey,
        paymentPublicKey,
      });
    }
  }, [
    ordinalAddress,
    paymentAddress,
    setWalletProvider,
    publicKey,
    paymentPublicKey,
    signPsbtWrapper,
  ]);

  const renderStepContent = () => {
    switch (mintStep) {
      case "ready":
        return (
          <>
            <Button
              onClick={
                ordinalAddress
                  ? startMintProcess
                  : () => setWalletSelectorOpen(true)
              }
              disabled={isLoading}
              className="w-full bg-black text-white border-4 border-black font-bold text-2xl py-8 hover:bg-white hover:text-black transition duration-200 shadow-[8px_8px_0px_0px_rgba(0,0,0)]"
            >
              {!ordinalAddress ? "CONNECT WALLET" : "MINT"}
            </Button>

            {/* Wallet Connection UI - Responsive Dialog/Drawer */}
            {isMobile ? (
              <Drawer
                open={walletSelectorOpen}
                onOpenChange={setWalletSelectorOpen}
              >
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
              <Dialog
                open={walletSelectorOpen}
                onOpenChange={setWalletSelectorOpen}
              >
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
            )}
          </>
        );

      case "commit":
        return (
          <div className="space-y-4">
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">
                Step 1: Commit Transaction
              </h3>
              <p className="text-sm mb-2">
                Please sign the commit transaction to proceed.
              </p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={signCommitTransaction}
                disabled={isLoading || !paymentAddress}
                className="flex-1 bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
              >
                {isLoading ? "Signing..." : "Sign"}
              </Button>
              {transactions.commitSigned &&
                transactions.commitTxid &&
                !isLoading && (
                  <a
                    href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 border-4 border-black font-bold text-black hover:bg-blue-300 transition-colors"
                  >
                    View TX
                  </a>
                )}
              <Button
                onClick={resetMintProcess}
                disabled={isLoading}
                className="bg-white text-black border-4 border-black hover:bg-gray-100"
              >
                Reset
              </Button>
            </div>
          </div>
        );

      case "reveal":
        return (
          <div className="space-y-4">
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">Commit Transaction</h3>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-sm font-semibold">Signed ✓</span>
                  {transactions.commitBroadcasted && (
                    <span className="ml-4 text-sm font-semibold">
                      Broadcasted ✓
                    </span>
                  )}
                </div>
                {transactions.commitSigned &&
                  transactions.commitTxid &&
                  !isLoading && (
                    <div className="mt-2">
                      <a
                        href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
                      >
                        View transaction
                      </a>
                    </div>
                  )}
              </div>
            </div>
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">
                Step 2: Reveal Transaction
              </h3>
              <p className="text-sm mb-2">
                Please sign the reveal transaction to finalize the mint.
              </p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={signRevealTransaction}
                disabled={isLoading || !ordinalAddress}
                className="flex-1 bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
              >
                {isLoading ? "Signing..." : "Sign"}
              </Button>
              {transactions.revealSigned &&
                transactions.revealTxid &&
                !isLoading && (
                  <a
                    href={`https://ordiscan.com/tx/${transactions.revealTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 border-4 border-black font-bold text-black hover:bg-blue-300 transition-colors"
                  >
                    View TX
                  </a>
                )}
              <Button
                onClick={resetMintProcess}
                disabled={isLoading}
                className="bg-white text-black border-4 border-black hover:bg-gray-100"
              >
                Reset
              </Button>
            </div>
          </div>
        );

      case "success":
        return (
          <div className="space-y-4">
            <div className="p-6 border-4 border-black bg-green-200">
              <h3 className="text-xl font-bold mb-4 text-center">
                Mint Successful! 🎉
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Commit TX:</span>
                  <a
                    href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
                  >
                    View
                  </a>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-bold">Reveal TX:</span>
                  <a
                    href={`https://ordiscan.com/tx/${transactions.revealTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>

            <Button
              onClick={resetMintProcess}
              className="w-full bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
            >
              Mint Another
            </Button>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition duration-200">
      {mintStep === "ready" ? (
        <CardContent className="p-6">{renderStepContent()}</CardContent>
      ) : (
        <>
          <CardHeader className="border-b-4 border-black bg-blue-400">
            <CardTitle className="text-center text-2xl font-bold">
              Mint Your Ordinal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">{renderStepContent()}</CardContent>
        </>
      )}
    </Card>
  );
}

// Extracted wallet selector content to avoid duplication
function WalletSelectorContent({
  walletStatusMap,
  handleConnectWallet,
  formatWalletName,
}: {
  walletStatusMap: Record<string, boolean>;
  handleConnectWallet: (wallet: string) => Promise<void>;
  formatWalletName: (name: string) => string;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.values(SUPPORTED_WALLETS)
          .filter((wallet) => wallet.name === XVERSE || wallet.name === LEATHER)
          .sort((a, b) => {
            // Ensure XVERSE is always first
            if (a.name === XVERSE) return -1;
            if (b.name === XVERSE) return 1;

            // For other wallets, maintain installation-based sort
            const aInstalled =
              walletStatusMap[a.name as keyof typeof walletStatusMap];
            const bInstalled =
              walletStatusMap[b.name as keyof typeof walletStatusMap];

            if (aInstalled && !bInstalled) return -1;
            if (!aInstalled && bInstalled) return 1;

            return 0;
          })
          .map((wallet) => {
            const isInstalled =
              walletStatusMap[wallet.name as keyof typeof walletStatusMap];
            return (
              <button
                key={wallet.name}
                onClick={
                  isInstalled
                    ? () => handleConnectWallet(wallet.name)
                    : undefined
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
    </>
  );
}
