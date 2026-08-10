"use client";

import { useEffect, useState, useCallback } from "react";
import { useMint } from "@/store/mint-store";
import {
  useLaserEyes,
  XVERSE,
  LEATHER,
} from "@omnisat/lasereyes";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { CommitStep } from "./CommitStep";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { RevealStep } from "./RevealStep";
import { SuccessStep } from "./SuccessStep";
import { WalletSelector } from "./WalletSelector";

export function MintForm() {
  const {
    mintStep,
    isLoading,
    transactions,
    startMintProcess,
    signCommitTransaction,
    signRevealTransaction,
    resetMintProcess,
    setWalletProvider,
  } = useMint();

  // State for wallet dialog/drawer
  const [walletSelectorOpen, setWalletSelectorOpen] = useState(false);

  const {
    address: ordinalAddress,
    paymentAddress,
    signPsbt: laserEyesSignPsbt,
    publicKey,
    paymentPublicKey,
    connect,
    hasXverse,
    hasLeather,
  } = useLaserEyes();

  const walletStatusMap = {
    [XVERSE]: hasXverse,
    [LEATHER]: hasLeather,
  };

  const handleConnectWallet = async (walletName: string) => {
    setWalletSelectorOpen(false);
    await connect(walletName as typeof XVERSE | typeof LEATHER);
  };

  const signPsbtWrapper = useCallback(
    async (
      options: {
        tx: string;
        finalize?: boolean;
        broadcast?: boolean;
        inputsToSign: { index: number; address: string }[];
      },
    ): Promise<{ psbt?: string; txId?: string }> => {
      const response = await laserEyesSignPsbt(options);

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
            <ConnectWalletButton
              ordinalAddress={ordinalAddress}
              isLoading={isLoading}
              startMintProcess={startMintProcess}
              openWalletSelector={() => setWalletSelectorOpen(true)}
            />

            <WalletSelector
              open={walletSelectorOpen}
              onOpenChange={setWalletSelectorOpen}
              walletStatusMap={walletStatusMap}
              handleConnectWallet={handleConnectWallet}
            />
          </>
        );

      case "commit":
        return (
          <CommitStep
            isLoading={isLoading}
            transactions={transactions}
            paymentAddress={paymentAddress}
            signCommitTransaction={signCommitTransaction}
            resetMintProcess={resetMintProcess}
          />
        );

      case "reveal":
        return (
          <RevealStep
            isLoading={isLoading}
            transactions={transactions}
            ordinalAddress={ordinalAddress}
            signRevealTransaction={signRevealTransaction}
            resetMintProcess={resetMintProcess}
          />
        );

      case "success":
        return (
          <SuccessStep
            transactions={transactions}
            resetMintProcess={resetMintProcess}
          />
        );
    }
  };

  return (
    <div className="bg-card text-card-foreground flex w-full max-w-md flex-col gap-6 rounded-xl border-4 border-black py-6 shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition duration-200">
      {mintStep === "ready" ? (
        <div className="p-6">{renderStepContent()}</div>
      ) : (
        <>
          <div className="grid auto-rows-min items-start gap-1.5 border-b-4 border-black bg-blue-400 px-6">
            <div className="text-center text-2xl font-bold leading-none">
              Mint Your Ordinal
            </div>
          </div>
          <div className="p-6">{renderStepContent()}</div>
        </>
      )}
    </div>
  );
}
