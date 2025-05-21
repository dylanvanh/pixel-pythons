import { env } from "@/env";
import ApiClient from "./api-client";

export type UTXO = {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
};
export type RecommendedFees = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};
type TransactionPrevout = {
  scriptpubkey_type: string;
  value: number;
  scriptpubkey_address: string;
};
type TransactionVin = {
  prevout: TransactionPrevout;
  witness?: string[];
};
type TransactionVout = {
  scriptpubkey_type: string;
  scriptpubkey?: string;
  scriptpubkey_address?: string;
  value: number;
};
type Transaction = {
  vin: TransactionVin[];
  vout: TransactionVout[];
};

export class MempoolClient extends ApiClient {
  constructor() {
    super(MempoolClient.getBaseUrl());
  }

  private static getBaseUrl(): string {
    return `${env.MEMPOOL_URL}/api`;
  }

  async getFastestFee(): Promise<number> {
    const recommendedFees = await this.getRecommendedFees();
    return recommendedFees.fastestFee;
  }

  async getTransaction(txid: string): Promise<Transaction> {
    return this.api.get(`/tx/${txid}`).then((response) => response.data);
  }

  async getAddress(address: string) {
    return this.api
      .get(`/address/${address}`)
      .then((response) => response.data);
  }

  async getRecommendedFees(): Promise<RecommendedFees> {
    return this.api
      .get("/v1/fees/recommended")
      .then((response) => response.data);
  }

  async getUTXOs(address: string): Promise<UTXO[]> {
    // This loop and delay are a workaround for potential stale data from the Mempool API.
    // Occasionally, the API might return UTXOs that have already been spent.
    // Retrying the request multiple times with a small delay increases the likelihood of getting the latest data.
    let lastResponseData: UTXO[] = [];
    for (let i = 0; i < 5; i++) {
      const response = await this.api.get(
        `/address/${address}/utxo?_=${Date.now()}`,
      );
      lastResponseData = response.data;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return lastResponseData;
  }

  async broadcastTransaction(rawTx: string): Promise<string> {
    return this.api
      .post("/tx", rawTx, {
        headers: {
          "Content-Type": "text/plain",
        },
      })
      .then((response) => response.data);
  }
}

export const mempoolClient = new MempoolClient();
