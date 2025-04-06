import { bitcoin } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'

// Get projectId from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "d5da24c7e8148ad904dd7bb310d48150" // this is a public projectId only to use on localhost

if (!projectId) {
  throw new Error('Project ID is not defined')
}

export const networks = [bitcoin] as [AppKitNetwork, ...AppKitNetwork[]]

// Set up Bitcoin Adapter
export const bitcoinAdapter = new BitcoinAdapter({
  projectId
})