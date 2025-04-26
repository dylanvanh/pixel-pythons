import ApiClient from "./api-client";

export type Inscription = {
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  ownerAddress: string;
  ownerOutput: string;
  genesisAddress: string;
  genesisOutput: string;
  timestamp: string;
  metadata: string | Record<string, string | number> | null;
  contentUrl: string;
};

type InscriptionApiResponse = {
  inscription_id: string;
  inscription_number: number;
  content_type: string;
  owner_address: string;
  owner_output: string;
  genesis_address: string;
  genesis_output: string;
  timestamp: string;
  metadata: string | Record<string, string | number> | null;
  content_url: string;
};

export class OrdiscanClient extends ApiClient {
  private static instance: OrdiscanClient | null = null;

  private constructor() {
    super(OrdiscanClient.getBaseUrl());
  }

  public static getInstance(): OrdiscanClient {
    if (!OrdiscanClient.instance) {
      OrdiscanClient.instance = new OrdiscanClient();
    }
    return OrdiscanClient.instance;
  }

  private static getBaseUrl(): string {
    return `${process.env.ORDISCAN_URL}`;
  }

  async getInscriptionInfo(inscriptionId: string): Promise<Inscription> {
    const response = await this.api
      .get<InscriptionApiResponse>(`/inscription/${inscriptionId}`)
      .then((response) => response.data);

    return {
      inscriptionId: response.inscription_id,
      inscriptionNumber: response.inscription_number,
      contentType: response.content_type,
      ownerAddress: response.owner_address,
      ownerOutput: response.owner_output,
      genesisAddress: response.genesis_address,
      genesisOutput: response.genesis_output,
      timestamp: response.timestamp,
      contentUrl: response.content_url,
      metadata: response.metadata,
    };
  }
}

export const mempoolClient = OrdiscanClient.getInstance();
