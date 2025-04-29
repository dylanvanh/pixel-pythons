export type MintStep = "ready" | "commit" | "reveal" | "success";

export type LaserEyesWallet = {
  ordinalAddress: string;
  paymentAddress: string;
  publicKey?: string;
  paymentPublicKey?: string;
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
};

export type MintState = {
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
};
