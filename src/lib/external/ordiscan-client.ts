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

type InscriptionApiPayload = {
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
  constructor() {
    super(OrdiscanClient.getBaseUrl());

    const apiKey = process.env.ORDISCAN_API_KEY!;
    this.api.defaults.headers.common["Authorization"] = `Bearer ${apiKey}`;
  }

  private static getBaseUrl(): string {
    const baseUrl = process.env.ORDISCAN_URL;
    if (!baseUrl) {
      throw new Error("ORDISCAN_URL environment variable is not set.");
    }
    return baseUrl;
  }

  async getInscriptionInfo(inscriptionId: string): Promise<Inscription> {
    const response = await this.api
      .get<{ data: InscriptionApiPayload }>( // Expect { data: { data: Payload } } from raw response
        `/inscription/${inscriptionId}`,
      )
      .then((axiosResponse) => {
        const innerData = axiosResponse?.data?.data;
        if (!innerData) {
          throw new Error(
            "Invalid nested API response structure received from Ordiscan.",
          );
        }
        return innerData;
      });

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

export const ordiscanClient = new OrdiscanClient();
