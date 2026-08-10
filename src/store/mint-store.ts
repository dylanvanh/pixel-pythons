import { useState } from "react";
import { postInternalApi } from "@/lib/internal-api-client";
import { handleError } from "@/lib/error/handlers/error-handler";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { PrepareCommitRequest } from "@/lib/zod-types/commit-types";
import { PrepareRevealRequest } from "@/lib/zod-types/reveal-types";
import { BroadcastRevealRequest } from "@/lib/zod-types/broadcast-reveal";

type MintStep = "ready" | "commit" | "reveal" | "success";

export type Transactions = {
  commitTxid: string;
  revealTxid: string;
  commitSigned: boolean;
  revealSigned: boolean;
  commitBroadcasted: boolean;
};

type LaserEyesWallet = {
  ordinalAddress: string;
  paymentAddress: string;
  publicKey?: string;
  paymentPublicKey?: string;
  signPsbt: (options: {
    tx: string;
    finalize?: boolean;
    broadcast?: boolean;
    inputsToSign: { index: number; address: string }[];
  }) => Promise<{ psbt?: string; txId?: string }>;
};

const INITIAL_TRANSACTIONS: Transactions = {
  commitTxid: "",
  revealTxid: "",
  commitSigned: false,
  revealSigned: false,
  commitBroadcasted: false,
};

export function useMint() {
  const [mintStep, setMintStep] = useState<MintStep>("ready");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [walletProvider, setWalletProvider] =
    useState<LaserEyesWallet | null>(null);
  const [sessionId, setSessionId] = useState<string>();

  const resetMintProcess = () => {
    setMintStep("ready");
    setTransactions(INITIAL_TRANSACTIONS);
  };

  const startMintProcess = () => setMintStep("commit");

  const signCommitTransaction = async () => {
    if (!walletProvider) {
      console.error("Wallet provider not connected or addresses not available");
      return;
    }

    const { paymentAddress, ordinalAddress, publicKey, paymentPublicKey } =
      walletProvider;
    if (!publicKey || !paymentPublicKey) {
      handleError(new Error("Public keys not available"), "Missing Public Keys");
      return;
    }

    setIsLoading(true);

    try {
      const payload: PrepareCommitRequest = {
        paymentAddress,
        ordinalsAddress: ordinalAddress,
        ordinalsPublicKey: publicKey,
        paymentPublicKey,
      };
      const commitResult = await postInternalApi<{
        commitPsbt: string;
        sessionId: string;
      }>("/api/prepare-commit", payload);
      const parsedPsbt = bitcoin.Psbt.fromBase64(commitResult.commitPsbt);
      const inputsToSign = Array.from(
        { length: parsedPsbt.data.inputs.length },
        (_, index) => ({ index, address: paymentAddress }),
      );
      const result = await walletProvider.signPsbt({
        tx: commitResult.commitPsbt,
        inputsToSign,
        finalize: true,
        broadcast: true,
      });

      const commitTxid = result.txId;
      if (!commitTxid) {
        throw new Error("No transaction ID returned from signing");
      }

      setTransactions((currentTransactions) => ({
        ...currentTransactions,
        commitTxid,
        commitSigned: true,
        commitBroadcasted: true,
      }));
      setSessionId(commitResult.sessionId);
      setMintStep("reveal");
    } catch (error) {
      console.error("Error signing commit transaction:", error);
      handleError(error, "Error signing commit transaction");
    } finally {
      setIsLoading(false);
    }
  };

  const signRevealTransaction = async () => {
    if (
      !walletProvider ||
      !walletProvider.publicKey ||
      !walletProvider.paymentPublicKey ||
      !sessionId
    ) {
      handleError(
        new Error("Wallet or address details missing."),
        "Configuration Error",
      );
      return;
    }

    setIsLoading(true);

    try {
      const preparePayload: PrepareRevealRequest = {
        commitTxid: transactions.commitTxid,
        ordinalsAddress: walletProvider.ordinalAddress,
        ordinalsPublicKey: walletProvider.publicKey,
        paymentAddress: walletProvider.paymentAddress,
        paymentPublicKey: walletProvider.paymentPublicKey,
        sessionId,
      };
      const prepareResult = await postInternalApi<{
        revealPsbt: string;
        inputSigningMap?: { index: number; address: string }[];
      }>("/api/prepare-reveal", preparePayload);
      const availableAddresses = [
        walletProvider.ordinalAddress,
        walletProvider.paymentAddress,
      ];
      const inputsToSign = prepareResult.inputSigningMap
        ? prepareResult.inputSigningMap.filter((input) =>
            availableAddresses.includes(input.address),
          )
        : [{ index: 0, address: walletProvider.ordinalAddress }];

      if (inputsToSign.length === 0) {
        throw new Error("No wallet address matches the required signing inputs");
      }

      const signResult = await walletProvider.signPsbt({
        tx: prepareResult.revealPsbt,
        inputsToSign,
        finalize: true,
        broadcast: false,
      });
      if (!signResult.psbt) {
        throw new Error("Wallet did not return signed PSBT data after signing");
      }

      setTransactions((currentTransactions) => ({
        ...currentTransactions,
        revealSigned: true,
      }));
      const broadcastPayload: BroadcastRevealRequest = {
        signedPsbtBase64: signResult.psbt,
        commitTxid: transactions.commitTxid,
        ordinalsAddress: walletProvider.ordinalAddress,
      };
      const broadcastResponse = await postInternalApi<{
        revealTxid: string;
      }>("/api/broadcast-reveal", broadcastPayload);

      setTransactions((currentTransactions) => ({
        ...currentTransactions,
        revealTxid: broadcastResponse.revealTxid,
      }));
      setMintStep("success");
    } catch (error) {
      console.error("Error during reveal signing or backend broadcast:", error);
      setMintStep("reveal");
      handleError(error, "Failed to finalize reveal transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mintStep,
    isLoading,
    transactions,
    startMintProcess,
    signCommitTransaction,
    signRevealTransaction,
    resetMintProcess,
    setWalletProvider,
  };
}
