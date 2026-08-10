import { ordiscanClient } from "../../external/ordiscan-client";
import { mempoolClient } from "../../external/mempool-client";

export async function getCleanPaymentUtxos(
  userPaymentAddress: string,
  excludeSpentUtxos?: Set<string>,
  maxRetries = 20,
  delayMs = 500,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rawUtxos = await ordiscanClient.getAddressUTXOs(userPaymentAddress);

    if (rawUtxos.length === 0) {
      const isLastAttempt = attempt === maxRetries - 1;
      if (isLastAttempt) {
        throw new Error("No UTXOs found in payment wallet");
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const availableUtxos = rawUtxos
      .filter((utxo) => {
        // Skip UTXOs that were consumed in another transaction (if provided)
        if (excludeSpentUtxos && excludeSpentUtxos.has(utxo.outpoint)) {
          return false;
        }

        return utxo.inscriptions.length === 0 && utxo.runes.length === 0;
      })
      .map((utxo) => {
        const [txid, voutStr] = utxo.outpoint.split(":");
        const vout = parseInt(voutStr, 10);
        return {
          txid,
          vout,
          value: utxo.value,
        };
      });

    if (availableUtxos.length > 0) {
      return availableUtxos;
    }

    const isLastAttempt = attempt === maxRetries - 1;
    if (!isLastAttempt) {
      console.log(
        `No clean payment UTXOs found (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    "No clean payment UTXOs found after multiple attempts. All UTXOs may be spent or contain inscriptions/runes.",
  );
}

export async function getAvailablePaymentUtxos(
  commitTxid: string,
  userPaymentAddress: string,
  maxRetries = 20,
  delayMs = 500,
) {
  const commitTx = await fetchTransactionWithRetry(
    commitTxid,
    maxRetries,
    delayMs,
  );
  if (!commitTx) {
    throw new Error(`Failed to retrieve commit transaction ${commitTxid}`);
  }

  const spentUtxoOutpoints = new Set(
    commitTx.vin.map((input) => `${input.txid}:${input.vout}`),
  );

  return getCleanPaymentUtxos(
    userPaymentAddress,
    spentUtxoOutpoints,
    maxRetries,
    delayMs,
  );
}

async function fetchTransactionWithRetry(
  txid: string,
  maxRetries: number,
  delayMs: number,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await mempoolClient.getTransaction(txid);
    } catch (error) {
      if (attempt === maxRetries - 1) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to fetch transaction ${txid} after ${maxRetries} attempts: ${message}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
