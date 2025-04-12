import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";
import { create } from "zustand";

export type MintStep = "ready" | "commit" | "reveal" | "success";

// Custom type for our LaserEyes wallet interface
interface LaserEyesWallet {
  ordinalAddress: string;
  paymentAddress: string;
  publicKey?: string;
  paymentPublicKey?: string;
  // Type that's compatible with LaserEyes' signPsbt
  signPsbt: (
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
  ) => Promise<{ psbt?: string; txId?: string }>;
}

interface MintState {
  mintStep: MintStep;
  isLoading: boolean;
  transactions: {
    commitTxid: string;
    revealTxid: string;
    commitSigned: boolean;
    revealSigned: boolean;
    commitBroadcasted: boolean;
    revealBroadcasted: boolean;
  };

  // Wallet and address states
  walletProvider: LaserEyesWallet | null;
  paymentAddress: string;
  ordinalsAddress: string;

  // Actions
  setMintStep: (step: MintStep) => void;
  setIsLoading: (loading: boolean) => void;
  setCommitTxid: (txid: string) => void;
  setRevealTxid: (txid: string) => void;
  setCommitSigned: (signed: boolean) => void;
  setRevealSigned: (signed: boolean) => void;
  setCommitBroadcasted: (broadcasted: boolean) => void;
  setRevealBroadcasted: (broadcasted: boolean) => void;
  setWalletProvider: (provider: LaserEyesWallet | null) => void;
  setAddresses: (paymentAddr: string, ordinalsAddr: string) => void;
  resetMintProcess: () => void;

  // Process flow
  startMintProcess: () => Promise<void>;
  signCommitTransaction: () => Promise<void>;
  signRevealTransaction: () => Promise<void>;
}

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

      // With LaserEyes, we already have the addresses directly
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

    setIsLoading(true);

    try {
      // Prepare commit transaction via API route
      const commitResult = await fetch("/api/prepare-commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentAddress,
          ordinalsAddress,
          ordinalsPublicKey: walletProvider.publicKey,
          paymentPublicKey: walletProvider.paymentPublicKey,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to prepare commit transaction");
        }
        return response.json();
      });

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
      alert(`Error signing commit transaction: ${error}`);
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
      ordinalsAddress,
      walletProvider,
    } = get();

    if (!walletProvider || !ordinalsAddress) {
      console.error("Wallet provider not connected or address not available");
      return;
    }

    setIsLoading(true);

    try {
      // Get the reveal PSBT from localStorage
      const revealPsbt = localStorage.getItem("revealPsbt");
      if (!revealPsbt) {
        // If not found in localStorage, prepare it via API
        const result = await fetch("/api/prepare-reveal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commitTxid: get().transactions.commitTxid,
            ordinalsAddress,
            ordinalsPublicKey: walletProvider.publicKey,
            paymentAddress: get().paymentAddress,
            paymentPublicKey: walletProvider.paymentPublicKey,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const data = await response.json();
            throw new Error(
              data.error || "Failed to prepare reveal transaction",
            );
          }
          return response.json();
        });

        if (!result.revealPsbt) {
          throw new Error("Failed to prepare reveal PSBT");
        }

        // Sign with LaserEyes using the inputSigningMap from the API
        const signResult = await walletProvider.signPsbt({
          tx: result.revealPsbt,
          inputsToSign: result.inputSigningMap,
          finalize: true,
          broadcast: true,
        });

        if (signResult.txId) {
          setRevealTxid(signResult.txId);
          setRevealSigned(true);
          setRevealBroadcasted(true);
          setMintStep("success");
        } else {
          throw new Error("No transaction ID returned from signing");
        }
      } else {
        // This case should not happen with the new implementation
        // but keeping it for backward compatibility
        console.warn("Using stored PSBT - this should not happen with the new implementation");
        const result = await walletProvider.signPsbt({
          tx: revealPsbt,
          inputsToSign: Array.from({
            length: bitcoin.Psbt.fromBase64(revealPsbt).data.inputs.length,
          }).map((_, i) => ({
            index: i,
            address: i === 0 ? ordinalsAddress : get().paymentAddress,
          })),
          finalize: true,
          broadcast: true,
        });

        if (result.txId) {
          setRevealTxid(result.txId);
          setRevealSigned(true);
          setRevealBroadcasted(true);
          setMintStep("success");

          // Clear localStorage
          localStorage.removeItem("revealPsbt");
        } else {
          throw new Error("No transaction ID returned from signing");
        }
      }
    } catch (error) {
      console.error("Error signing reveal transaction:", error);
      alert(`Error signing reveal transaction: ${error}`);
    } finally {
      setIsLoading(false);
    }
  },
}));
