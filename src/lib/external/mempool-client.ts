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

interface TransactionPrevout {
  scriptpubkey_type: string;
  value: number;
}
interface TransactionVin {
  prevout: TransactionPrevout;
  witness?: string[];
}
interface TransactionVout {
  scriptpubkey_type: string;
  value: number;
}
interface Transaction {
  vin: TransactionVin[];
  vout: TransactionVout[];
}

export class MempoolClient extends ApiClient {
  private static instance: MempoolClient | null = null;

  private constructor() {
    super(MempoolClient.getBaseUrl());
  }

  public static getInstance(): MempoolClient {
    if (!MempoolClient.instance) {
      MempoolClient.instance = new MempoolClient();
    }
    return MempoolClient.instance;
  }

  private static getBaseUrl(): string {
    return `${process.env.MEMPOOL_URL}/api`;
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
    return this.api
      .get(`/address/${address}/utxo`)
      .then((response) => response.data);
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

export const mempoolClient = MempoolClient.getInstance();
