"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
} from "@omnisat/lasereyes";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { CommitStep } from "./CommitStep";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { RevealStep } from "./RevealStep";
import { SuccessStep } from "./SuccessStep";
import { WalletSelector } from "./WalletSelector";

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

  const formatWalletName = (name: string) => {
    return name
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

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
              formatWalletName={formatWalletName}
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
