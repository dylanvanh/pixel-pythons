import { env } from "@/env";

const REQUEST_TIMEOUT_MS = 10_000;

export type UTXO = {
  outpoint: string;
  value: number;
  runes: unknown[];
  inscriptions: string[];
};

async function getAddressUTXOs(bitcoinAddress: string): Promise<UTXO[]> {
  const response = await fetch(
    `${env.ORDISCAN_URL}/v1/address/${bitcoinAddress}/utxos`,
    {
      headers: { Authorization: `Bearer ${env.ORDISCAN_API_KEY}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error(`Ordiscan request failed: ${response.status}`);
  }

  const responseData = (await response.json()) as { data?: UTXO[] };
  if (!responseData.data) {
    throw new Error("Invalid Ordiscan response");
  }
  return responseData.data;
}

export const ordiscanClient = { getAddressUTXOs };
