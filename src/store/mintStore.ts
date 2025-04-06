import { create } from "zustand";
import type { BitcoinConnector } from "@reown/appkit-adapter-bitcoin";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";

export type MintStep = "ready" | "commit" | "reveal" | "success";

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
  walletProvider: BitcoinConnector | null;
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
  setWalletProvider: (provider: BitcoinConnector | null) => void;
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
  setWalletProvider: (provider: BitcoinConnector | null) =>
    set(() => {
      // When setting wallet provider, also try to fetch addresses
      if (provider) {
        provider
          .getAccountAddresses()
          .then((accountAddresses) => {
            const paymentAddr = accountAddresses.find(
              (addr) => addr.purpose === "payment",
            );
            const ordinalAddr = accountAddresses.find(
              (addr) => addr.purpose === "ordinal",
            );

            if (paymentAddr && ordinalAddr) {
              set({
                paymentAddress: paymentAddr.address,
                ordinalsAddress: ordinalAddr.address,
              });
            } else if (accountAddresses.length > 0) {
              // Fallback to first address if no ordinal address is found
              set({
                paymentAddress: accountAddresses[0].address,
                ordinalsAddress: accountAddresses[0].address,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to fetch addresses:", err);
          });
      }

      return { walletProvider: provider };
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

    if (!walletProvider || !paymentAddress || !ordinalsAddress) {
      console.error("Wallet provider not connected or addresses not available");
      return;
    }

    setIsLoading(true);

    try {
      // Get address information from wallet
      const addresses = await walletProvider.getAccountAddresses();
      const paymentAddrInfo = addresses.find(
        (addr) => addr.address === paymentAddress,
      );
      const ordinalAddrInfo = addresses.find(
        (addr) => addr.address === ordinalsAddress,
      );

      if (!paymentAddrInfo?.publicKey || !ordinalAddrInfo?.publicKey) {
        throw new Error("Public keys not available for addresses");
      }

      // Prepare commit transaction via API route
      const commitResult = await fetch("/api/prepare-commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentAddress,
          ordinalsAddress,
          ordinalsPublicKey: ordinalAddrInfo.publicKey,
          paymentPublicKey: paymentAddrInfo.publicKey,
          text: "Minted with Ordinal Mint",
        }),
      }).then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(
              data.error || "Failed to prepare commit transaction",
            );
          });
        }
        return response.json();
      });

      // Extract commit PSBT from the response
      const psbt = commitResult.commitPsbt;
      console.log("Commit PSBT prepared:", psbt.slice(0, 40) + "...");

      // Parse the PSBT to get the number of inputs
      const parsedPsbt = bitcoin.Psbt.fromBase64(psbt);
      const numberOfInputs = parsedPsbt.data.inputs.length;
      console.log("Number of inputs to sign:", numberOfInputs);

      // Sign all inputs with payment address
      const result = await walletProvider.signPSBT({
        psbt,
        signInputs: Array.from({ length: numberOfInputs }).map((_, i) => ({
          address: paymentAddress,
          index: i,
          sighashTypes: [1], // SIGHASH_ALL
        })),
        broadcast: true,
      });

      console.log("Signed commit transaction:", result);

      // Mark commit as signed
      setCommitSigned(true);

      // Set commit txid if available
      if (result.txid) {
        setCommitTxid(result.txid);
        setCommitBroadcasted(true);
        // Move to reveal step
        setMintStep("reveal");
      }
    } catch (error) {
      console.error("Error signing commit transaction:", error);
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
      walletProvider,
    } = get();

    if (!walletProvider || !ordinalsAddress || !transactions.commitTxid) {
      console.error(
        "Wallet provider not connected, ordinal address not available, or commit txid missing",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Find ordinal address info
      const addresses = await walletProvider.getAccountAddresses();
      const ordinalAddrInfo = addresses.find(
        (addr) => addr.address === ordinalsAddress,
      );

      if (!ordinalAddrInfo?.publicKey) {
        throw new Error("Public key not available for ordinal address");
      }

      // Create reveal parameters from ordinal public key via API route
      const revealResult = await fetch("/api/prepare-reveal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commitTxid: transactions.commitTxid,
          ordinalsAddress,
          ordinalsPublicKey: ordinalAddrInfo.publicKey,
        }),
      }).then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            throw new Error(
              data.error || "Failed to prepare reveal transaction",
            );
          });
        }
        return response.json();
      });

      if (!revealResult.revealPsbt) {
        throw new Error("Failed to prepare reveal PSBT");
      }

      console.log(
        "Reveal PSBT prepared:",
        revealResult.revealPsbt.slice(0, 40) + "...",
      );

      // Parse the PSBT to get the number of inputs
      const parsedPsbt = bitcoin.Psbt.fromBase64(revealResult.revealPsbt);
      const numberOfInputs = parsedPsbt.data.inputs.length;
      console.log("Number of inputs to sign:", numberOfInputs);

      // Sign all inputs with ordinal address
      const result = await walletProvider.signPSBT({
        psbt: revealResult.revealPsbt,
        signInputs: Array.from({ length: numberOfInputs }).map((_, i) => ({
          address: ordinalsAddress,
          index: i,
          sighashTypes: [1], // SIGHASH_ALL
        })),
        broadcast: true,
      });

      console.log("Signed reveal transaction:", result);

      // Mark reveal as signed
      setRevealSigned(true);

      // Set reveal txid if available
      if (result.txid) {
        setRevealTxid(result.txid);
        setRevealBroadcasted(true);
        // Move to success state
        setMintStep("success");
      }
    } catch (error) {
      console.error("Error signing reveal transaction:", error);
    } finally {
      setIsLoading(false);
    }
  },
}));
