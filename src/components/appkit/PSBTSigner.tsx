'use client'

import { useState, useEffect } from 'react'
import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useClientMounted } from '@/hooks/useClientMount'

export const PSBTSigner = () => {
  const [inputPsbt, setInputPsbt] = useState('')
  const [inputIndex, setInputIndex] = useState('0')
  const [signedPsbt, setSignedPsbt] = useState('')
  const [error, setError] = useState('')
  const [addresses, setAddresses] = useState<BitcoinConnector.AccountAddress[]>([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const mounted = useClientMounted()
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')

  // Fetch all addresses when wallet provider is available
  useEffect(() => {
    if (walletProvider) {
      const fetchAddresses = async () => {
        try {
          const accountAddresses = await walletProvider.getAccountAddresses();
          setAddresses(accountAddresses);
          
          // Try to find a taproot address (purpose 'ordinal')
          const taprootAddress = accountAddresses.find(addr => addr.purpose === 'ordinal');
          if (taprootAddress) {
            setSelectedAddress(taprootAddress.address);
          } else if (accountAddresses.length > 0) {
            // Default to first address if no taproot found
            setSelectedAddress(accountAddresses[0].address);
          }
        } catch (err) {
          console.error('Failed to fetch addresses:', err);
          setError('Failed to fetch addresses');
        }
      };
      
      fetchAddresses();
    }
  }, [walletProvider]);

  const handleSignPSBT = async () => {
    if (!walletProvider || !selectedAddress) {
      setError('Wallet is not connected or no address selected')
      return
    }

    console.log("Using address for signing:", selectedAddress);

    // Clean the PSBT input by removing whitespace, newlines, etc.
    const cleanPsbt = inputPsbt.trim().replace(/\s+/g, '');
    
    if (!cleanPsbt) {
      setError('Please enter a PSBT string')
      return
    }

    const index = parseInt(inputIndex, 10)
    if (isNaN(index) || index < 0) {
      setError('Please enter a valid input index (0 or higher)')
      return
    }

    setError('')
    
    try {
      const result = await walletProvider.signPSBT({
        psbt: cleanPsbt,
        signInputs: [
          {
            address: selectedAddress,
            index: index,
            sighashTypes: [1] // SIGHASH_ALL is typically 1
          }
        ],
        broadcast:true 
      })
      
      console.log("result", result);

      setSignedPsbt(result.psbt)
    } catch (err) {
      setError(`Failed to sign PSBT: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (!mounted) return null

  return (
    <section>
      <h2>PSBT Signer</h2>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="psbt-input" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          PSBT String:
        </label>
        <textarea
          id="psbt-input"
          rows={4}
          value={inputPsbt}
          onChange={(e) => setInputPsbt(e.target.value)}
          placeholder="Enter PSBT base64 string..."
          style={{ 
            width: '100%', 
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #e0e0e0' 
          }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="address-select" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Signing Address:
        </label>
        <select
          id="address-select"
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          style={{ 
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #e0e0e0' 
          }}
        >
          {addresses.length === 0 && <option value="">Loading addresses...</option>}
          {addresses.map((addr) => (
            <option key={addr.address} value={addr.address}>
              {addr.address} ({addr.purpose})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="input-index" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Input Index to Sign:
        </label>
        <input
          id="input-index"
          type="number"
          min="0"
          value={inputIndex}
          onChange={(e) => setInputIndex(e.target.value)}
          style={{ 
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #e0e0e0' 
          }}
        />
      </div>
      
      <button onClick={handleSignPSBT} disabled={!walletProvider || !selectedAddress}>
        Sign PSBT
      </button>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px', fontWeight: 'bold' }}>
          {error}
        </div>
      )}
      
      {signedPsbt && (
        <div style={{ marginTop: '15px' }}>
          <h3 style={{ marginBottom: '5px' }}>Signed PSBT:</h3>
          <pre style={{ 
            padding: '10px',
            background: '#f1f1f1',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            overflowX: 'auto'
          }}>
            {signedPsbt}
          </pre>
        </div>
      )}
    </section>
  )
} 