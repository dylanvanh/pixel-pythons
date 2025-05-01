import { create } from "zustand";
import { internalApi } from "@/lib/internal-api-client";
import { handleError } from "@/lib/error/handlers/error-handler";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { LaserEyesWallet, MintState, MintStep } from "./store-types";
import { PrepareCommitRequest } from "@/lib/zod-types/commit-types";
import { PrepareRevealRequest } from "@/lib/zod-types/reveal-types";
import { BroadcastRevealRequest } from "@/lib/zod-types/broadcast-reveal";

export const useMintStore = create<MintState>((set, get) => ({
  mintStep: "ready",
  isLoading: false,
  transactions: {
    commitTxid: "",
    revealTxid: "",
    commitSigned: false,
    revealSigned: false,
    commitBroadcasted: false,
    revealBroadcasted: false,
  },

  // Wallet and address states
  walletProvider: null,
  paymentAddress: "",
  ordinalsAddress: "",
  mintIndex: undefined,

  // Actions
  setMintStep: (step: MintStep) => set({ mintStep: step }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setMintIndex: (mintIndex: number) => set({ mintIndex }),
  setCommitTxid: (txid: string) =>
    set((state) => ({
      transactions: { ...state.transactions, commitTxid: txid },
    })),
  setRevealTxid: (txid: string) =>
    set((state) => ({
      transactions: { ...state.transactions, revealTxid: txid },
    })),
  setCommitSigned: (signed: boolean) =>
    set((state) => ({
      transactions: { ...state.transactions, commitSigned: signed },
    })),
  setRevealSigned: (signed: boolean) =>
    set((state) => ({
      transactions: { ...state.transactions, revealSigned: signed },
    })),
  setCommitBroadcasted: (broadcasted: boolean) =>
    set((state) => ({
      transactions: { ...state.transactions, commitBroadcasted: broadcasted },
    })),
  setRevealBroadcasted: (broadcasted: boolean) =>
    set((state) => ({
      transactions: { ...state.transactions, revealBroadcasted: broadcasted },
    })),
  setWalletProvider: (provider: LaserEyesWallet | null) =>
    set(() => {
      if (!provider) {
        return {
          walletProvider: null,
          paymentAddress: "",
          ordinalsAddress: "",
        };
      }

      return {
        walletProvider: provider,
        paymentAddress: provider.paymentAddress,
        ordinalsAddress: provider.ordinalAddress,
      };
    }),
  setAddresses: (paymentAddr: string, ordinalsAddr: string) =>
    set({
      paymentAddress: paymentAddr,
      ordinalsAddress: ordinalsAddr,
    }),
  resetMintProcess: () =>
    set({
      mintStep: "ready",
      transactions: {
        commitTxid: "",
        revealTxid: "",
        commitSigned: false,
        revealSigned: false,
        commitBroadcasted: false,
        revealBroadcasted: false,
      },
    }),

  // Process flow
  startMintProcess: async () => {
    const { setMintStep, setIsLoading } = get();

    setIsLoading(true);
    setMintStep("commit");
    setIsLoading(false);
  },

  signCommitTransaction: async () => {
    const {
      setMintStep,
      setIsLoading,
      setCommitSigned,
      setCommitTxid,
      setCommitBroadcasted,
      setMintIndex,
      paymentAddress,
      ordinalsAddress,
      walletProvider,
    } = get();

    console.log("paymentAddress", paymentAddress);
    console.log("ordinalsAddress", ordinalsAddress);

    if (!walletProvider || !paymentAddress || !ordinalsAddress) {
      console.error("Wallet provider not connected or addresses not available");
      return;
    }

    if (!walletProvider.publicKey || !walletProvider.paymentPublicKey) {
      console.error("Public keys not available from wallet provider");
      handleError(
        new Error("Public keys not available"),
        "Missing Public Keys",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const payload: PrepareCommitRequest = {
        paymentAddress,
        ordinalsAddress,
        ordinalsPublicKey: walletProvider.publicKey,
        paymentPublicKey: walletProvider.paymentPublicKey,
      };

      const commitResult = await internalApi.post<{
        commitPsbt: string;
        commitFee: number;
        controlBlock: string;
        inscriptionScript: string;
        taprootRevealScript: string;
        taprootRevealValue: number;
        revealFee: number;
        postage: number;
        mintIndex: number;
      }>("/api/prepare-commit", payload);

      console.log("commitResult", commitResult);

      const psbt = commitResult.commitPsbt;
      console.log("Commit PSBT prepared:", psbt.slice(0, 40) + "...");

      const parsedPsbt = bitcoin.Psbt.fromBase64(psbt);
      const numberOfInputs = parsedPsbt.data.inputs.length;
      console.log("Number of inputs to sign:", numberOfInputs);

      const result = await walletProvider.signPsbt({
        tx: psbt,
        inputsToSign: Array.from({ length: numberOfInputs }).map((_, i) => ({
          index: i,
          address: paymentAddress,
        })),
        finalize: true,
        broadcast: true,
      });

      console.log("result", result);

      if (result.txId) {
        setCommitTxid(result.txId);
        setCommitSigned(true);
        setCommitBroadcasted(true);
        setMintIndex(commitResult.mintIndex);
        setMintStep("reveal");
      } else {
        throw new Error("No transaction ID returned from signing");
      }
    } catch (error) {
      console.error("Error signing commit transaction:", error);
      handleError(error, "Error signing commit transaction");
    } finally {
      setIsLoading(false);
    }
  },

  signRevealTransaction: async () => {
    const {
      setMintStep,
      setIsLoading,
      setRevealSigned,
      setRevealTxid,
      setRevealBroadcasted,
      transactions,
      ordinalsAddress,
      paymentAddress,
      walletProvider,
      mintIndex,
    } = get();

    if (
      !walletProvider ||
      !ordinalsAddress ||
      !paymentAddress ||
      !walletProvider.publicKey ||
      !walletProvider.paymentPublicKey
    ) {
      console.error("Wallet provider or necessary details missing for reveal.");
      handleError(
        new Error("Wallet or address details missing."),
        "Configuration Error",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let signedPsbtBase64: string | undefined;

    try {
      const preparePayload: PrepareRevealRequest = {
        commitTxid: transactions.commitTxid,
        ordinalsAddress,
        ordinalsPublicKey: walletProvider.publicKey,
        paymentAddress,
        paymentPublicKey: walletProvider.paymentPublicKey,
        mintIndex: mintIndex as number,
      };

      const prepareResult = await internalApi.post<{
        revealPsbt: string;
        inputSigningMap?: { index: number; address: string }[];
      }>("/api/prepare-reveal", preparePayload);

      if (!prepareResult.revealPsbt) {
        throw new Error("Failed to prepare reveal PSBT from API");
      }
      const revealPsbt = prepareResult.revealPsbt;

      const availableAddresses = [ordinalsAddress, paymentAddress].filter(
        Boolean,
      );
      const inputsToSign = prepareResult.inputSigningMap
        ? prepareResult.inputSigningMap.filter(
            (input: { index: number; address: string }) =>
              availableAddresses.includes(input.address),
          )
        : [{ index: 0, address: ordinalsAddress }];

      if (inputsToSign.length === 0) {
        throw new Error(
          `None of your available addresses (${availableAddresses.join(", ")}) match the required signing addresses in the input map.`,
        );
      }
      console.log(
        `Found ${inputsToSign.length} inputs to sign for reveal:`,
        inputsToSign,
      );

      console.log(
        "Requesting wallet signature for reveal PSBT (no broadcast)...",
      );
      const signResult = await walletProvider.signPsbt({
        tx: revealPsbt,
        inputsToSign: inputsToSign,
        finalize: true,
        broadcast: false,
      });

      signedPsbtBase64 = signResult.psbt;

      if (!signedPsbtBase64) {
        throw new Error(
          "Wallet did not return signed PSBT data after signing.",
        );
      }
      console.log("Signed reveal PSBT obtained from wallet.");
      setRevealSigned(true);

      console.log("Sending signed PSBT to backend for broadcast...");
      const broadcastPayload: BroadcastRevealRequest = {
        signedPsbtBase64: signedPsbtBase64,
        commitTxid: transactions.commitTxid,
        ordinalsAddress: ordinalsAddress,
      };

      const broadcastResponse = await internalApi.post<{
        revealTxid: string;
        inscriptionId: string;
      }>("/api/broadcast-reveal", broadcastPayload);

      console.log("Backend broadcast successful:", broadcastResponse);
      setRevealTxid(broadcastResponse.revealTxid);
      setRevealBroadcasted(true);
      setMintStep("success");
    } catch (error) {
      console.error("Error during reveal signing or backend broadcast:", error);
      setRevealBroadcasted(false);
      setRevealSigned(get().transactions.revealSigned);
      setMintStep("reveal");
      handleError(error, "Failed to finalize reveal transaction");
    } finally {
      setIsLoading(false);
    }
  },
}));
