"use client";

import { useLaserEyes, WalletIcon } from "@omnisat/lasereyes";
import { truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CopyToClipboard } from "./CopyToClipboard";
import { LogOut } from "lucide-react";

export interface WalletInfoProps {
  className?: string;
}

export function WalletInfo({ className }: WalletInfoProps) {
  const {
    address: ordinalAddress,
    paymentAddress,
    provider,
    disconnect,
  } = useLaserEyes();

  if (!ordinalAddress || !paymentAddress) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div className="border-2 border-black p-2 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0)] flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {provider && (
            <div className="flex items-center gap-1.5 bg-orange-200 border-2 border-black py-0.5 px-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0)]">
              <WalletIcon walletName={provider} size={14} />
              <span className="font-bold text-[10px] uppercase">
                {provider}
              </span>
            </div>
          )}

          <div className="font-mono text-xs text-black/70 flex flex-row sm:flex-col gap-2 sm:gap-0 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-0.5 bg-black text-white">
                ORD
              </span>
              <span>{truncateAddress(ordinalAddress, 5)}</span>
              <CopyToClipboard value={ordinalAddress} className="p-0.5 -mr-1" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-0.5 bg-black text-white">
                PAY
              </span>
              <span>{truncateAddress(paymentAddress, 5)}</span>
              <CopyToClipboard value={paymentAddress} className="p-0.5 -mr-1" />
            </div>
          </div>
        </div>

        <button
          onClick={() => disconnect()}
          className="border-2 border-black bg-white hover:bg-red-100 transition-colors py-0.5 px-1.5 flex items-center gap-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0)] ml-auto sm:ml-0"
          aria-label="Disconnect wallet"
          title="Disconnect wallet"
        >
          <LogOut className="h-3 w-3" />
          <span className="hidden xs:inline">Disconnect</span>
        </button>
      </div>
    </div>
  );
}

