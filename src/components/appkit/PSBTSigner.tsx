'use client'

import { useState, useEffect } from 'react'
import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useClientMounted } from '@/hooks/useClientMount'

enum TransactionType {
  COMMIT = 'COMMIT',
  REVEAL = 'REVEAL',
  CUSTOM = 'CUSTOM',
}

export const PSBTSigner = () => {
  const [inputPsbt, setInputPsbt] = useState('')
  const [commitTxid, setCommitTxid] = useState('')
  const [signedPsbt, setSignedPsbt] = useState('')
  const [txid, setTxid] = useState('')
  const [error, setError] = useState('')
  const [addresses, setAddresses] = useState<BitcoinConnector.AccountAddress[]>([])
  const [paymentAddress, setPaymentAddress] = useState('')
  const [ordinalAddress, setOrdinalAddress] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.CUSTOM)
  const [isLoading, setIsLoading] = useState(false)
  const mounted = useClientMounted()
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')

  // Fetch all addresses when wallet provider is available
  useEffect(() => {
    if (walletProvider) {
      const fetchAddresses = async () => {
        try {
          const accountAddresses = await walletProvider.getAccountAddresses();
          setAddresses(accountAddresses);
          
          // Find payment and ordinal addresses
          const paymentAddr = accountAddresses.find(addr => addr.purpose === 'payment');
          const ordinalAddr = accountAddresses.find(addr => addr.purpose === 'ordinal');
          
          if (paymentAddr) {
            setPaymentAddress(paymentAddr.address);
          }
          
          if (ordinalAddr) {
            setOrdinalAddress(ordinalAddr.address);
          } else if (accountAddresses.length > 0) {
            // Fallback to first address if no ordinal address is found
            setOrdinalAddress(accountAddresses[0].address);
          }
        } catch (err) {
          console.error('Failed to fetch addresses:', err);
          setError('Failed to fetch addresses');
        }
      };
      
      fetchAddresses();
    }
  }, [walletProvider]);

  const prepareAndSignCommitTx = async () => {
    if (!walletProvider || !paymentAddress || !ordinalAddress) {
      setError('Wallet is not connected or addresses not available')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // Find the public keys
      const paymentAddrInfo = addresses.find(addr => addr.address === paymentAddress)
      const ordinalAddrInfo = addresses.find(addr => addr.address === ordinalAddress)
      
      if (!paymentAddrInfo?.publicKey || !ordinalAddrInfo?.publicKey) {
        throw new Error('Public keys not available for addresses')
      }

      // Prepare commit transaction via API route
      const commitResult = await fetch('/api/prepare-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentAddress,
          ordinalsAddress: ordinalAddress,
          ordinalsPublicKey: ordinalAddrInfo.publicKey,
          paymentPublicKey: paymentAddrInfo.publicKey,
          text: "Minting via AppKit",
        }),
      }).then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to prepare commit transaction');
          });
        }
        return response.json();
      });

      // Extract commit PSBT from the response
      const psbt = commitResult.commitPsbt;
      console.log("Commit PSBT prepared:", psbt.slice(0, 40) + "...");
      
      // Sign inputs with payment address
      // Note: We're using actual UTXOs count from the wallet for signing
      // This assumes the API returns the number of inputs in the commitFee
      const numberOfInputs = 1; // Default to 1, adjust based on your actual PSBT structure
      
      const result = await walletProvider.signPSBT({
        psbt,
        signInputs: Array.from({ length: numberOfInputs }).map((_, i) => ({
          address: paymentAddress,
          index: i,
          sighashTypes: [1] // SIGHASH_ALL
        })),
        broadcast: true
      });
      
      console.log("Signed commit transaction:", result);
      setSignedPsbt(result.psbt);
      
      if (result.txid) {
        setTxid(result.txid);
        setCommitTxid(result.txid); // Save for reveal tx
      }
    } catch (err) {
      setError(`Failed to prepare or sign commit transaction: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }

  const prepareAndSignRevealTx = async () => {
    if (!walletProvider || !ordinalAddress || !commitTxid) {
      setError('Wallet is not connected, ordinal address not available, or commit txid missing')
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // Find ordinal address info
      const ordinalAddrInfo = addresses.find(addr => addr.address === ordinalAddress)
      
      if (!ordinalAddrInfo?.publicKey) {
        throw new Error('Public key not available for ordinal address')
      }

      // Create reveal parameters from ordinal public key via API route
      const revealResult = await fetch('/api/prepare-reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commitTxid,
          ordinalsAddress: ordinalAddress,
          ordinalsPublicKey: ordinalAddrInfo.publicKey,
        }),
      }).then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to prepare reveal transaction');
          });
        }
        return response.json();
      });

      if (!revealResult.revealPsbt) {
        throw new Error('Failed to prepare reveal PSBT');
      }

      console.log("Reveal PSBT prepared:", revealResult.revealPsbt.slice(0, 40) + "...");
      
      // Sign the reveal transaction with ordinal address
      const result = await walletProvider.signPSBT({
        psbt: revealResult.revealPsbt,
        signInputs: [
          {
            address: ordinalAddress,
            index: 0,  // Reveal tx has only one input
            sighashTypes: [1] // SIGHASH_ALL
          }
        ],
        broadcast: true
      });
      
      console.log("Signed reveal transaction:", result);
      setSignedPsbt(result.psbt);
      
      if (result.txid) {
        setTxid(result.txid);
      }
    } catch (err) {
      setError(`Failed to prepare or sign reveal transaction: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }

  const signCustomPSBT = async () => {
    if (!walletProvider || !inputPsbt) {
      setError('Wallet is not connected or no PSBT entered')
      return
    }

    // Determine which address to use based on selected transaction type
    const signingAddress = transactionType === TransactionType.COMMIT 
      ? paymentAddress 
      : ordinalAddress

    if (!signingAddress) {
      setError(`No ${transactionType.toLowerCase()} address available`)
      return
    }

    setIsLoading(true)
    setError('')
    
    try {
      // Clean the PSBT input by removing whitespace, newlines, etc.
      const cleanPsbt = inputPsbt.trim().replace(/\s+/g, '');
      
      if (!cleanPsbt) {
        throw new Error('Please enter a valid PSBT string')
      }
      
      const result = await walletProvider.signPSBT({
        psbt: cleanPsbt,
        signInputs: [
          {
            address: signingAddress,
            index: 0, // This is a simplification - might need to sign multiple inputs
            sighashTypes: [1] // SIGHASH_ALL
          }
        ],
        broadcast: true
      })
      
      console.log("Custom PSBT signing result:", result)
      setSignedPsbt(result.psbt)
      
      if (result.txid) {
        setTxid(result.txid)
        
        // If this was a commit tx, save its txid for potential reveal tx later
        if (transactionType === TransactionType.COMMIT) {
          setCommitTxid(result.txid)
        }
      }
    } catch (err) {
      setError(`Failed to sign PSBT: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Bitcoin Transaction Signer</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Addresses</h3>
          <ul className="space-y-2">
            {addresses.map((addr) => (
              <li key={addr.address} className="border p-2 rounded">
                <div className="font-mono text-sm break-all">
                  {addr.address}
                </div>
                <div className="text-xs">
                  <span className="font-semibold">Purpose:</span> {addr.purpose}
                </div>
                {addr.publicKey && (
                  <div className="text-xs">
                    <span className="font-semibold">Public Key:</span> {addr.publicKey.substring(0, 10)}...
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Transaction Type</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTransactionType(TransactionType.COMMIT)}
                className={`px-3 py-1 rounded ${transactionType === TransactionType.COMMIT ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Commit
              </button>
              <button
                onClick={() => setTransactionType(TransactionType.REVEAL)}
                className={`px-3 py-1 rounded ${transactionType === TransactionType.REVEAL ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Reveal
              </button>
              <button
                onClick={() => setTransactionType(TransactionType.CUSTOM)}
                className={`px-3 py-1 rounded ${transactionType === TransactionType.CUSTOM ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                Custom PSBT
              </button>
            </div>
          </div>
          
          {transactionType === TransactionType.CUSTOM && (
            <div>
              <label htmlFor="psbt-input" className="block text-sm font-medium mb-1">
                PSBT String:
              </label>
              <textarea
                id="psbt-input"
                rows={4}
                value={inputPsbt}
                onChange={(e) => setInputPsbt(e.target.value)}
                placeholder="Enter PSBT base64 string..."
                className="w-full p-2 border rounded"
              />
            </div>
          )}
          
          {transactionType === TransactionType.REVEAL && (
            <div>
              <label htmlFor="commit-txid" className="block text-sm font-medium mb-1">
                Commit Transaction ID:
              </label>
              <input
                id="commit-txid"
                type="text"
                value={commitTxid}
                onChange={(e) => setCommitTxid(e.target.value)}
                placeholder="Enter commit transaction ID..."
                className="w-full p-2 border rounded"
              />
            </div>
          )}
          
          <div className="flex justify-center">
            {transactionType === TransactionType.COMMIT && (
              <button
                onClick={prepareAndSignCommitTx}
                disabled={isLoading || !walletProvider || !paymentAddress || !ordinalAddress}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Prepare & Sign Commit Transaction'}
              </button>
            )}
            
            {transactionType === TransactionType.REVEAL && (
              <button
                onClick={prepareAndSignRevealTx}
                disabled={isLoading || !walletProvider || !ordinalAddress || !commitTxid}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Prepare & Sign Reveal Transaction'}
              </button>
            )}
            
            {transactionType === TransactionType.CUSTOM && (
              <button
                onClick={signCustomPSBT}
                disabled={isLoading || !walletProvider || !inputPsbt}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Sign Custom PSBT'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {signedPsbt && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h3 className="font-bold mb-2">Signed PSBT:</h3>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
            {signedPsbt}
          </pre>
        </div>
      )}
      
      {txid && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-bold mb-2">Transaction ID:</h3>
          <div className="font-mono break-all">{txid}</div>
        </div>
      )}
    </section>
  )
} 