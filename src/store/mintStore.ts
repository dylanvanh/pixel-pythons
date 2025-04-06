import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  
  // Actions
  setMintStep: (step: MintStep) => void;
  setIsLoading: (loading: boolean) => void;
  setCommitTxid: (txid: string) => void;
  setRevealTxid: (txid: string) => void;
  setCommitSigned: (signed: boolean) => void;
  setRevealSigned: (signed: boolean) => void;
  setCommitBroadcasted: (broadcasted: boolean) => void;
  setRevealBroadcasted: (broadcasted: boolean) => void;
  resetMintProcess: () => void;
  
  // Process flow
  startMintProcess: () => Promise<void>;
  signCommitTransaction: () => Promise<void>;
  signRevealTransaction: () => Promise<void>;
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
        commitBroadcasted: false,
        revealBroadcasted: false
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
      setCommitBroadcasted: (broadcasted) => set(state => ({
        transactions: { ...state.transactions, commitBroadcasted: broadcasted }
      })),
      setRevealBroadcasted: (broadcasted) => set(state => ({
        transactions: { ...state.transactions, revealBroadcasted: broadcasted }
      })),
      resetMintProcess: () => set({ 
        mintStep: "ready", 
        transactions: { 
          commitTxid: "", 
          revealTxid: "", 
          commitSigned: false, 
          revealSigned: false,
          commitBroadcasted: false,
          revealBroadcasted: false
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
        const { setMintStep, setIsLoading, setCommitSigned, setCommitTxid, setCommitBroadcasted } = get();
        
        setIsLoading(true);
        
        // Simulate waiting for commit signature
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Set commit txid immediately after signing
        setCommitTxid("4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b");
        
        // Mark commit as signed
        setCommitSigned(true);
        
        // Broadcast commit transaction immediately
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCommitBroadcasted(true);
        
        // Move to reveal step
        setMintStep("reveal");
        setIsLoading(false);
      },
      
      signRevealTransaction: async () => {
        const { setMintStep, setIsLoading, setRevealSigned, setRevealTxid, setRevealBroadcasted } = get();
        
        setIsLoading(true);
        
        // Simulate waiting for reveal signature
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Set reveal txid immediately after signing
        setRevealTxid("6a5b3d2f7c8e9a1b4c6d3e2f1a9b8c7d6e5f4a3b2c1d9e8f7a6b5c4d3e2f1a0b");
        
        // Mark reveal as signed
        setRevealSigned(true);
        
        // Broadcast reveal transaction immediately
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRevealBroadcasted(true);
        
        // Move to success state
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