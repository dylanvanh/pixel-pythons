'use client'

import PsbtSigner from "@/components/PsbtSigner"
import ConnectWallet from "@/components/ConnectWallet"
import Link from "next/link"

export default function PsbtSignerPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">
              <Link href="/">Ordinal Mint</Link>
            </h1>
            <span className="font-semibold text-orange-500">PSBT Signer</span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-12 px-4 bg-gradient-to-b from-orange-50 to-amber-100">
        <PsbtSigner />
      </main>
    </div>
  )
} 