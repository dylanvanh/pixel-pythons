import { getBitcoinEnv } from "@/features/bitcoin/server/env.server";

const REQUEST_TIMEOUT_10_SECONDS_MS = 10_000;
const UTXO_REFRESH_ATTEMPTS = 5;
const UTXO_REFRESH_DELAY_100_MILLISECONDS_MS = 100;

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

export type Transaction = {
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
  }[];
  vout: {
    scriptpubkey: string;
    value: number;
  }[];
};

export const mempoolClient = {
  getFastestFee,
  getTransaction,
  getUTXOs,
  broadcastTransaction,
};

async function getFastestFee(): Promise<number> {
  const fees = await getJson<{ fastestFee: number }>("/v1/fees/recommended");

  return fees.fastestFee;
}

async function getTransaction(txid: string): Promise<Transaction> {
  return getJson(`/tx/${txid}`);
}

async function getUTXOs(address: string): Promise<UTXO[]> {
  let latestUtxos: UTXO[] = [];

  for (let attempt = 0; attempt < UTXO_REFRESH_ATTEMPTS; attempt++) {
    latestUtxos = await getJson(`/address/${address}/utxo?_=${Date.now()}`);
    await new Promise((resolve) => setTimeout(resolve, UTXO_REFRESH_DELAY_100_MILLISECONDS_MS));
  }

  return latestUtxos;
}

async function broadcastTransaction(rawTransaction: string): Promise<string> {
  const response = await fetch(`${getBitcoinEnv().MEMPOOL_URL}/api/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: rawTransaction,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_10_SECONDS_MS),
  });

  if (!response.ok) {
    throw new Error(`Mempool request failed: ${response.status}`);
  }

  return response.text();
}

async function getJson<ResponseData>(path: string): Promise<ResponseData> {
  const response = await fetch(`${getBitcoinEnv().MEMPOOL_URL}/api${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_10_SECONDS_MS),
  });

  if (!response.ok) {
    throw new Error(`Mempool request failed: ${response.status}`);
  }

  return response.json() as Promise<ResponseData>;
}
