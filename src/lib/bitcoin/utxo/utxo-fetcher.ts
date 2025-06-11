import { ordiscanClient } from "../../external/ordiscan-client";
import { isUtxoClean, extractSpentUtxoOutpoints, fetchTransactionWithRetry } from "./utxo-utils";

export async function getCleanPaymentUtxos(
  userPaymentAddress: string,
  excludeSpentUtxos?: Set<string>,
  maxRetries = 20,
  delayMs = 500
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rawUtxos = await ordiscanClient.getAddressUTXOs(userPaymentAddress);
    
    if (rawUtxos.length === 0) {
      const isLastAttempt = attempt === maxRetries - 1;
      if (isLastAttempt) {
        throw new Error("No UTXOs found in payment wallet");
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    const availableUtxos = rawUtxos
      .filter((utxo) => {
        // Skip UTXOs that were consumed in another transaction (if provided)
        if (excludeSpentUtxos && excludeSpentUtxos.has(utxo.outpoint)) {
          return false;
        }
        
        // Only include clean UTXOs (no inscriptions or runes)
        return isUtxoClean(utxo);
      })
      .map((utxo) => {
        const [txid, voutStr] = utxo.outpoint.split(':');
        const vout = parseInt(voutStr, 10);
        return {
          txid,
          vout,
          value: utxo.value,
          status: { confirmed: true, block_height: 0, block_hash: "", block_time: 0 }
        };
      });

    if (availableUtxos.length > 0) {
      return availableUtxos;
    }

    const isLastAttempt = attempt === maxRetries - 1;
    if (!isLastAttempt) {
      console.log(`No clean payment UTXOs found (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error("No clean payment UTXOs found after multiple attempts. All UTXOs may be spent or contain inscriptions/runes.");
}

export async function getAvailablePaymentUtxos(
  commitTxid: string,
  userPaymentAddress: string,
  maxRetries = 20,
  delayMs = 500
) {
  const commitTx = await fetchTransactionWithRetry(commitTxid, maxRetries, delayMs);
  if (!commitTx) {
    throw new Error(`Failed to retrieve commit transaction ${commitTxid}`);
  }
  
  const spentUtxoOutpoints = extractSpentUtxoOutpoints(commitTx);
  
  return await getCleanPaymentUtxos(userPaymentAddress, spentUtxoOutpoints, maxRetries, delayMs);
} 