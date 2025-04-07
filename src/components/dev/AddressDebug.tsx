'use client'

import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'

export function AddressDebug() {
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')
  
  if (process.env.NODE_ENV === "production") return null;

  const logAddresses = async () => {
    if (!walletProvider) {
      console.log('No wallet provider connected')
      return
    }

    try {
      const addresses = await walletProvider.getAccountAddresses()
      console.log('Raw AppKit Address Response:', addresses)
      // Pretty print the addresses for better readability
      addresses.forEach((addr, i) => {
        console.log(`\nAddress ${i + 1}:`)
        console.log(JSON.stringify(addr, null, 2))
      })
    } catch (err) {
      console.error('Error fetching addresses:', err)
    }
  }

  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={logAddresses}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Debug Addresses
      </button>
    </div>
  )
} 