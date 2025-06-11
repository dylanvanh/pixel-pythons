import { UTXO as OrdiscanUTXO } from "../../external/ordiscan-client";
import { mempoolClient } from "../../external/mempool-client";
import type { Transaction } from '../../external/mempool-client';

type CleanUtxoCheck = Pick<OrdiscanUTXO, 'outpoint' | 'inscriptions' | 'runes'>;

export function isUtxoClean(utxo: CleanUtxoCheck): boolean {
  return utxo.inscriptions.length === 0 && utxo.runes.length === 0;
}

function isTransaction(transaction: unknown): transaction is Transaction {
  if (typeof transaction !== 'object' || transaction === null || !('vin' in transaction)) {
    return false;
  }
  
  const txWithVin = transaction as { vin: unknown };
  
  if (!Array.isArray(txWithVin.vin)) {
    return false;
  }
  
  return txWithVin.vin.every((input: unknown) => 
    typeof input === 'object' && 
    input !== null && 
    'txid' in input &&
    'vout' in input &&
    typeof (input as { txid: unknown }).txid === 'string' && 
    typeof (input as { vout: unknown }).vout === 'number'
  );
}

export function extractSpentUtxoOutpoints(transaction: unknown): Set<string> {
  if (!isTransaction(transaction)) {
    return new Set<string>();
  }
  
  const spentOutpoints = new Set<string>();
  
  transaction.vin.forEach((input) => {
    spentOutpoints.add(`${input.txid}:${input.vout}`);
  });
  
  return spentOutpoints;
}

export async function fetchTransactionWithRetry(
  txid: string,
  maxRetries = 20,
  delayMs = 500
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await mempoolClient.getTransaction(txid);
    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries - 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (isLastAttempt) {
        throw new Error(`Failed to fetch transaction ${txid} after ${maxRetries} attempts: ${errorMessage}`);
      }
      console.log(`Transaction fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
} 