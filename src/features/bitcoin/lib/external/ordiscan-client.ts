import { getBitcoinEnv } from "@/features/bitcoin/server/env.server";

const REQUEST_TIMEOUT_10_SECONDS_MS = 10_000;

export type UTXO = {
  outpoint: string;
  value: number;
  runes: unknown[];
  inscriptions: string[];
};

export const ordiscanClient = { getAddressUTXOs };

async function getAddressUTXOs(bitcoinAddress: string): Promise<UTXO[]> {
  const response = await fetch(
    `${getBitcoinEnv().ORDISCAN_URL}/v1/address/${bitcoinAddress}/utxos`,
    {
      headers: { Authorization: `Bearer ${getBitcoinEnv().ORDISCAN_API_KEY}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_10_SECONDS_MS),
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
