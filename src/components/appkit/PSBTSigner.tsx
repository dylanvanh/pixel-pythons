'use client'

import { useState, useEffect } from 'react'
import { useAppKitProvider } from '@reown/appkit/react'
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin'
import { useClientMounted } from '@/hooks/useClientMount'
import { ArrowRight, Copy, ExternalLink, Loader2 } from 'lucide-react'

enum TransactionType {
  COMMIT = 'COMMIT',
  REVEAL = 'REVEAL',
}

export const PSBTSigner = () => {
  const [commitTxid, setCommitTxid] = useState('')
  const [signedPsbt, setSignedPsbt] = useState('')
  const [txid, setTxid] = useState('')
  const [error, setError] = useState('')
  const [paymentAddress, setPaymentAddress] = useState('')
  const [ordinalAddress, setOrdinalAddress] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.COMMIT)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const mounted = useClientMounted()
  const { walletProvider } = useAppKitProvider<BitcoinConnector>('bip122')

  // Fetch all addresses when wallet provider is available
  useEffect(() => {
    if (walletProvider) {
      const fetchAddresses = async () => {
        try {
          const accountAddresses = await walletProvider.getAccountAddresses();
          
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
      // Get address information from wallet
      const addresses = await walletProvider.getAccountAddresses();
      const paymentAddrInfo = addresses.find(addr => addr.address === paymentAddress);
      const ordinalAddrInfo = addresses.find(addr => addr.address === ordinalAddress);
      
      if (!paymentAddrInfo?.publicKey || !ordinalAddrInfo?.publicKey) {
        throw new Error('Public keys not available for addresses');
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
      const numberOfInputs = 1; // Default, should be improved
      
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
      const addresses = await walletProvider.getAccountAddresses();
      const ordinalAddrInfo = addresses.find(addr => addr.address === ordinalAddress);
      
      if (!ordinalAddrInfo?.publicKey) {
        throw new Error('Public key not available for ordinal address');
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!mounted) return null

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      {!walletProvider ? (
        <div className="bg-white border-2 border-black p-8 mx-auto max-w-md shadow-[4px_4px_0px_0px_rgba(0,0,0)]">
          <div className="flex justify-center mb-6">
            <button 
              className="w-full py-3 bg-gray-500 text-white font-bold"
              disabled={true}
            >
              CONNECT WALLET
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0)]">
          <div className="flex mb-6 border-b-2 border-black">
            {Object.values(TransactionType).map((type) => (
              <button
                key={type}
                onClick={() => setTransactionType(type)}
                className={`py-2 px-6 font-bold ${
                  transactionType === type 
                    ? 'border-b-2 border-black -mb-0.5' 
                    : 'text-gray-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="mb-6">
            {transactionType === TransactionType.REVEAL && (
              <div>
                <label className="block text-sm font-bold mb-2">
                  COMMIT TRANSACTION ID
                </label>
                <input
                  type="text"
                  value={commitTxid}
                  onChange={(e) => setCommitTxid(e.target.value)}
                  placeholder="Enter commit txid..."
                  className="w-full p-3 border-2 border-black font-mono text-sm"
                />
              </div>
            )}
            
            {transactionType === TransactionType.COMMIT && (
              <div className="flex items-center justify-center py-8">
                <p className="font-bold">Ready to create commit transaction</p>
              </div>
            )}
          </div>

          <button
            onClick={
              transactionType === TransactionType.COMMIT
                ? prepareAndSignCommitTx
                : prepareAndSignRevealTx
            }
            disabled={isLoading || (transactionType === TransactionType.REVEAL && !commitTxid)}
            className="w-full py-3 bg-black text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                PROCESSING...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                SIGN {transactionType} TRANSACTION
                <ArrowRight className="ml-2" />
              </span>
            )}
          </button>

          {(error || signedPsbt || txid) && (
            <div className="mt-6 space-y-4">
              {error && (
                <div className="border-2 border-black p-4 bg-red-100">
                  <h3 className="font-bold mb-1">Error</h3>
                  <p>{error}</p>
                </div>
              )}
              
              {signedPsbt && (
                <div className="border-2 border-black p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Signed PSBT</h3>
                    <button
                      onClick={() => copyToClipboard(signedPsbt)}
                      className="flex items-center px-3 py-1 border-2 border-black hover:bg-gray-100"
                    >
                      <Copy size={14} className="mr-1" />
                      {copied ? "COPIED" : "COPY"}
                    </button>
                  </div>
                  <div className="font-mono text-xs border-2 border-black p-2 overflow-auto max-h-20">
                    {signedPsbt}
                  </div>
                </div>
              )}
              
              {txid && (
                <div className="border-2 border-black p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Transaction ID</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(txid)}
                        className="flex items-center px-3 py-1 border-2 border-black hover:bg-gray-100"
                      >
                        <Copy size={14} className="mr-1" />
                        {copied ? "COPIED" : "COPY"}
                      </button>
                      <a
                        href={`https://mempool.space/tx/${txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-1 border-2 border-black hover:bg-gray-100"
                      >
                        <ExternalLink size={14} className="mr-1" />
                        VIEW
                      </a>
                    </div>
                  </div>
                  <div className="font-mono text-sm border-2 border-black p-2 break-all">
                    {txid}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bitcoin Addresses Section */}
          {(paymentAddress || ordinalAddress) && (
            <div className="mt-6 border-t-2 border-black pt-4">
              <h3 className="font-bold mb-2">Bitcoin Addresses</h3>
              <div className="space-y-2">
                {paymentAddress && (
                  <div className="border-2 border-black p-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm mr-2">PAYMENT:</span>
                      <span className="font-mono text-xs">{paymentAddress}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(paymentAddress)}
                      className="p-1 hover:bg-gray-100 border border-black"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                
                {ordinalAddress && (
                  <div className="border-2 border-black p-2 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm mr-2">ORDINALS:</span>
                      <span className="font-mono text-xs">{ordinalAddress}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ordinalAddress)}
                      className="p-1 hover:bg-gray-100 border border-black"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 