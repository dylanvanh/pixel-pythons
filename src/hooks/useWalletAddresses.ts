import { useState, useEffect } from 'react';
import type { BitcoinConnector } from '@reown/appkit-adapter-bitcoin';

interface WalletAddresses {
  paymentAddress: string;
  ordinalAddress: string;
  error: string | null;
}

export function useWalletAddresses(walletProvider: BitcoinConnector | null): WalletAddresses {
  const [paymentAddress, setPaymentAddress] = useState('');
  const [ordinalAddress, setOrdinalAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletProvider) {
      setPaymentAddress('');
      setOrdinalAddress('');
      setError(null);
      return;
    }

    const fetchAddresses = async () => {
      try {
        const accountAddresses = await walletProvider.getAccountAddresses();
        
        // Find payment address
        const paymentAddr = accountAddresses.find(addr => addr.purpose === 'payment');
        
        // Find ordinal address, handling type mismatch
        const ordinalAddr = accountAddresses.find(addr => {
          const purpose = addr.purpose as string;
          return purpose === 'ordinal' || purpose === 'ordinals';
        });
        
        if (paymentAddr) {
          setPaymentAddress(paymentAddr.address);
        }
        
        // Some wallets (like OKX) only provide a single payment address
        // In these cases, we use the same address for both payment and ordinals
        if (ordinalAddr) {
          setOrdinalAddress(ordinalAddr.address);
        } else if (paymentAddr) {
          // Fallback to payment address if no ordinal address is found
          setOrdinalAddress(paymentAddr.address);
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch addresses:', err);
        setError('Failed to fetch addresses');
        setPaymentAddress('');
        setOrdinalAddress('');
      }
    };
    
    fetchAddresses();
  }, [walletProvider]);

  return { paymentAddress, ordinalAddress, error };
} 