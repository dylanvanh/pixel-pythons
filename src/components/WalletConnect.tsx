"use client";

import { useState } from "react";
import { 
  UNISAT, 
  XVERSE, 
  LEATHER, 
  OKX, 
  PHANTOM,
  MAGIC_EDEN,
  ORANGE,
  OYL,
  WIZZ,
  useLaserEyes,
  WalletIcon,
  type ProviderType
} from "@omnisat/lasereyes-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Define wallets with their direct provider constants
const WALLETS = [
  { name: "UniSat", provider: UNISAT },
  { name: "Xverse", provider: XVERSE },
  { name: "Leather", provider: LEATHER },
  { name: "OKX", provider: OKX },
  { name: "Phantom", provider: PHANTOM },
  { name: "Magic Eden", provider: MAGIC_EDEN },
  { name: "Orange", provider: ORANGE },
  { name: "OYL", provider: OYL },
  { name: "Wizz", provider: WIZZ },
];

interface WalletConnectProps {
  variant?: 'default' | 'mint';
  className?: string;
}

export default function WalletConnect({ variant = 'default', className }: WalletConnectProps) {
  const { connect, disconnect, address } = useLaserEyes();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [connectedWalletProvider, setConnectedWalletProvider] = useState<ProviderType>(UNISAT);

  // Simple wrapper functions for each wallet type
  const connectToUnisat = () => handleWalletConnect(UNISAT);
  const connectToXverse = () => handleWalletConnect(XVERSE);
  const connectToLeather = () => handleWalletConnect(LEATHER);
  const connectToOkx = () => handleWalletConnect(OKX); 
  const connectToPhantom = () => handleWalletConnect(PHANTOM);
  const connectToMagicEden = () => handleWalletConnect(MAGIC_EDEN);
  const connectToOrange = () => handleWalletConnect(ORANGE);
  const connectToOyl = () => handleWalletConnect(OYL);
  const connectToWizz = () => handleWalletConnect(WIZZ);
  
  const getConnectFunction = (walletName: string) => {
    switch (walletName) {
      case "UniSat": return connectToUnisat;
      case "Xverse": return connectToXverse;
      case "Leather": return connectToLeather;
      case "OKX": return connectToOkx;
      case "Phantom": return connectToPhantom;
      case "Magic Eden": return connectToMagicEden;
      case "Orange": return connectToOrange;
      case "OYL": return connectToOyl;
      case "Wizz": return connectToWizz;
      default: return () => console.error("Unknown wallet");
    }
  };

  // Generic handler that accepts the correct provider type
  const handleWalletConnect = async (provider: ProviderType) => {
    setIsConnecting(true);
    setError("");
    
    try {
      await connect(provider);
      setConnectedWalletProvider(provider); // Store the connected wallet provider
      setIsOpen(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === 'WALLET_NOT_FOUND') {
        setError(`Please install wallet`);
      } else if (err?.code === 'USER_REJECTED') {
        setError('Connection rejected');
      } else {
        setError(`Failed to connect: ${err?.message || 'Unknown error'}`);
      }
      console.error("Wallet connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Render connected state
  const renderConnectedState = () => {
    if (variant === 'default') {
      return (
        <div className={cn("inline-flex items-center px-3 py-2 border-2 border-black bg-white neobrutalism-shadow rounded-md gap-2", className)}>
          <div className="flex items-center gap-1.5">
            <WalletIcon 
              walletName={connectedWalletProvider} 
              size={16} 
            />
            <span className="text-xs font-mono font-medium truncate max-w-[80px]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
          <button 
            onClick={() => disconnect()}
            className="ml-1.5 text-xs hover:text-red-600 transition-colors"
          >
            × Disconnect
          </button>
        </div>
      );
    }

    // For mint variant, we return null when connected as the mint button should be shown
    return null;
  };

  // Render connect button
  const renderConnectButton = () => {
    if (variant === 'default') {
      return (
        <button className={cn("inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-black text-white font-medium hover:bg-gray-800 transition-colors neobrutalism-shadow rounded-md", className)}>
          <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.5 17.5H5C4.17157 17.5 3.5 16.8284 3.5 16V8C3.5 7.17157 4.17157 6.5 5 6.5H18.5V17.5Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M18.5 17.5H19C19.8284 17.5 20.5 16.8284 20.5 16V8C20.5 7.17157 19.8284 6.5 19 6.5H18.5V17.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      );
    } else if (variant === 'mint') {
      return (
        <button className={cn("w-full bg-black text-white border-4 border-black font-bold text-xl py-4 hover:bg-white hover:text-black transition duration-200", className)}>
          {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
        </button>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) {
        setError(""); // Clear error when opening the dialog
      }
      setIsOpen(open);
    }}>
      {address ? renderConnectedState() : (
        <DialogTrigger asChild>
          {renderConnectButton()}
        </DialogTrigger>
      )}

      <DialogContent className="neobrutalism-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold mb-2">Connect Wallet</DialogTitle>
          <DialogDescription className="text-xs mb-2">
            Choose your Bitcoin wallet to connect
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-2 mb-2 bg-red-100 border-2 border-red-500 text-red-700 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {WALLETS.map((wallet) => (
            <button
              key={wallet.name}
              onClick={getConnectFunction(wallet.name)}
              disabled={isConnecting}
              className={cn(
                "p-2 flex flex-col items-center justify-center text-center",
                "bg-white border border-black hover:bg-gray-100 transition-colors",
                "neobrutalism-shadow hover:shadow-[4px_4px_0px_0px_rgba(0,0,0)]",
                isConnecting && "opacity-50 cursor-not-allowed"
              )}
            >
              <WalletIcon 
                walletName={wallet.provider as ProviderType} 
                size={24} 
                className="mb-1" 
              />
              <span className="font-bold text-xs">{wallet.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 