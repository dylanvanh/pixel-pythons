import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MintStep = "ready" | "commit" | "reveal" | "broadcasting" | "success";

interface MintState {
  mintStep: MintStep;
  isLoading: boolean;
  transactions: {
    commitTxid: string;
    revealTxid: string;
    commitSigned: boolean;
    revealSigned: boolean;
    broadcasted: boolean;
  };
  
  // Actions
  setMintStep: (step: MintStep) => void;
  setIsLoading: (loading: boolean) => void;
  setCommitTxid: (txid: string) => void;
  setRevealTxid: (txid: string) => void;
  setCommitSigned: (signed: boolean) => void;
  setRevealSigned: (signed: boolean) => void;
  setBroadcasted: (broadcasted: boolean) => void;
  resetMintProcess: () => void;
  
  // Process flow
  startMintProcess: () => Promise<void>;
  signCommitTransaction: () => Promise<void>;
  signRevealTransaction: () => Promise<void>;
  broadcastTransactions: () => Promise<void>;
}

export const useMintStore = create<MintState>()(
  persist(
    (set, get) => ({
      mintStep: "ready",
      isLoading: false,
      transactions: {
        commitTxid: "",
        revealTxid: "",
        commitSigned: false,
        revealSigned: false,
        broadcasted: false
      },
      
      // Actions
      setMintStep: (step) => set({ mintStep: step }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setCommitTxid: (txid) => set(state => ({ 
        transactions: { ...state.transactions, commitTxid: txid } 
      })),
      setRevealTxid: (txid) => set(state => ({ 
        transactions: { ...state.transactions, revealTxid: txid } 
      })),
      setCommitSigned: (signed) => set(state => ({
        transactions: { ...state.transactions, commitSigned: signed }
      })),
      setRevealSigned: (signed) => set(state => ({
        transactions: { ...state.transactions, revealSigned: signed }
      })),
      setBroadcasted: (broadcasted) => set(state => ({
        transactions: { ...state.transactions, broadcasted }
      })),
      resetMintProcess: () => set({ 
        mintStep: "ready", 
        transactions: { 
          commitTxid: "", 
          revealTxid: "", 
          commitSigned: false, 
          revealSigned: false,
          broadcasted: false
        } 
      }),
      
      // Process flow
      startMintProcess: async () => {
        const { setMintStep, setIsLoading } = get();
        
        setIsLoading(true);
        setMintStep("commit");
        setIsLoading(false);
      },
      
      signCommitTransaction: async () => {
        const { setMintStep, setIsLoading, setCommitSigned } = get();
        
        setIsLoading(true);
        
        // Simulate waiting for commit signature
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mark commit as signed
        setCommitSigned(true);
        
        // Move to reveal step
        setMintStep("reveal");
        setIsLoading(false);
      },
      
      signRevealTransaction: async () => {
        const { setMintStep, setIsLoading, setRevealSigned } = get();
        
        setIsLoading(true);
        
        // Simulate waiting for reveal signature
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mark reveal as signed
        setRevealSigned(true);
        
        // Ready to broadcast
        setMintStep("broadcasting");
        
        // Automatically start broadcasting
        get().broadcastTransactions();
      },
      
      broadcastTransactions: async () => {
        const { 
          setIsLoading, 
          setMintStep, 
          setBroadcasted, 
          setCommitTxid,
          setRevealTxid
        } = get();
        
        // Broadcast both transactions now that we have both signatures
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Set transaction IDs (would come from actual broadcast in production)
        setCommitTxid("4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b");
        setRevealTxid("6a5b3d2f7c8e9a1b4c6d3e2f1a9b8c7d6e5f4a3b2c1d9e8f7a6b5c4d3e2f1a0b");
        
        // Mark as broadcasted
        setBroadcasted(true);
        
        // Show success
        setMintStep("success");
        setIsLoading(false);
      }
    }),
    {
      name: 'mint-storage',
      partialize: (state) => ({ 
        mintStep: state.mintStep, 
        transactions: state.transactions 
      })
    }
  )
) 