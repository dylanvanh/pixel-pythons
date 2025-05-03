/**
 * Shared type definitions
 */
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

export type UserWalletInfo = {
  paymentAddress: string;
  ordinalsAddress: string;
  ordinalsPublicKey: string;
  paymentPublicKey?: string;
  utxos: UTXO[];
};

export type TextInscriptionData = {
  content: string;
  contentType?: string;
  postage?: number;
};
