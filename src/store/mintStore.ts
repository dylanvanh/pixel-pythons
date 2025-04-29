import { create } from "zustand";
import { internalApi } from "@/lib/internal-api-client";
import { handleError } from "@/lib/error/handlers/error-handler";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { LaserEyesWallet, MintState, MintStep } from "./store-types";
import { PrepareCommitRequest } from "@/lib/zod-types/commit-types";
import { PrepareRevealRequest } from "@/lib/zod-types/reveal-types";

// Create the store without persistence
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

  // Actions
  setMintStep: (step: MintStep) => set({ mintStep: step }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
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

    // Add checks for public keys
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
      }>("/api/prepare-commit", payload);

      console.log("commitResult", commitResult);

      // Extract commit PSBT from the response
      const psbt = commitResult.commitPsbt;
      console.log("Commit PSBT prepared:", psbt.slice(0, 40) + "...");

      // Parse the PSBT to get the number of inputs
      const parsedPsbt = bitcoin.Psbt.fromBase64(psbt);
      const numberOfInputs = parsedPsbt.data.inputs.length;
      console.log("Number of inputs to sign:", numberOfInputs);

      // Sign with LaserEyes
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
      paymentAddress,
      ordinalsAddress,
      walletProvider,
    } = get();

    if (!walletProvider || !ordinalsAddress || !paymentAddress) {
      console.error("Wallet provider not connected or addresses not available");
      return;
    }

    if (!walletProvider.publicKey || !walletProvider.paymentPublicKey) {
      console.error(
        "Public keys not available from wallet provider for reveal",
      );
      handleError(
        new Error("Public keys not available"),
        "Missing Public Keys for Reveal",
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const payload: PrepareRevealRequest = {
        commitTxid: get().transactions.commitTxid,
        ordinalsAddress,
        ordinalsPublicKey: walletProvider.publicKey,
        paymentAddress,
        paymentPublicKey: walletProvider.paymentPublicKey,
      };

      const result = await internalApi.post<{
        revealPsbt: string;
        revealFee: number;
        expectedInscriptionId: string;
        inputSigningMap: { index: number; address: string }[];
      }>("/api/prepare-reveal", payload);

      if (!result.revealPsbt) {
        throw new Error("Failed to prepare reveal PSBT");
      }

      console.log("Reveal PSBT input signing map:", result.inputSigningMap);

      const availableAddresses = [ordinalsAddress, paymentAddress].filter(
        Boolean,
      );
      console.log("Available addresses for signing:", availableAddresses);

      // Determine which inputs we can sign with our available addresses
      const inputsToSign = result.inputSigningMap
        ? result.inputSigningMap.filter(
            (input: { index: number; address: string }) =>
              availableAddresses.includes(input.address),
          )
        : // If no input signing map provided, default to index 0 with ordinals address
          [{ index: 0, address: ordinalsAddress }];

      if (inputsToSign.length === 0) {
        throw new Error(
          `None of your available addresses (${availableAddresses.join(", ")}) match the required signing addresses in the input map.`,
        );
      }

      console.log(`Found ${inputsToSign.length} inputs to sign:`, inputsToSign);

      // Sign and broadcast in a single operation
      const signResult = await walletProvider.signPsbt({
        tx: result.revealPsbt,
        inputsToSign: inputsToSign,
        finalize: true,
        broadcast: true,
      });

      if (!signResult.txId) {
        throw new Error("No transaction ID returned from signing");
      }

      setRevealTxid(signResult.txId);
      setRevealSigned(true);
      setRevealBroadcasted(true);
      setMintStep("success");

      if (result.expectedInscriptionId) {
        console.log("Expected inscription ID:", result.expectedInscriptionId);
      }
    } catch (error) {
      console.error("Error signing reveal transaction:", error);
      handleError(error, "Error signing reveal transaction");
    } finally {
      setIsLoading(false);
    }
  },
}));
