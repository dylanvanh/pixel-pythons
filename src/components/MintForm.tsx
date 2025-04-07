"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useMintStore } from "@/store/mintStore";
import { useLaserEyes } from "@omnisat/lasereyes";

export function MintForm() {
  const mintStep = useMintStore((state) => state.mintStep);
  const isLoading = useMintStore((state) => state.isLoading);
  const transactions = useMintStore((state) => state.transactions);
  const startMintProcess = useMintStore((state) => state.startMintProcess);
  const signCommitTransaction = useMintStore((state) => state.signCommitTransaction);
  const signRevealTransaction = useMintStore((state) => state.signRevealTransaction);
  const resetMintProcess = useMintStore((state) => state.resetMintProcess);
  const setWalletProvider = useMintStore((state) => state.setWalletProvider);

  // Get wallet info from LaserEyes
  const { address: ordinalAddress, paymentAddress, signPsbt, publicKey, paymentPublicKey } = useLaserEyes();

  // Initialize wallet when addresses are available
  useEffect(() => {
    if (ordinalAddress && paymentAddress) {
      setWalletProvider({ 
        ordinalAddress, 
        paymentAddress,
        signPsbt,
        publicKey,
        paymentPublicKey
      });
    }
  }, [ordinalAddress, paymentAddress, setWalletProvider, signPsbt, publicKey, paymentPublicKey]);

  const renderStepContent = () => {
    switch (mintStep) {
      case "ready":
        return (
          <Button
            onClick={startMintProcess}
            disabled={isLoading || !ordinalAddress}
            className="w-full bg-black text-white border-4 border-black font-bold text-2xl py-8 hover:bg-white hover:text-black transition duration-200"
          >
            {!ordinalAddress ? "CONNECT WALLET" : "MINT"}
          </Button>
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
                    href={`https://mempool.space/tx/${transactions.commitTxid}`}
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
                        href={`https://mempool.space/tx/${transactions.commitTxid}`}
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
                    href={`https://mempool.space/tx/${transactions.revealTxid}`}
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
                    href={`https://mempool.space/tx/${transactions.commitTxid}`}
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
                    href={`https://mempool.space/tx/${transactions.revealTxid}`}
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
