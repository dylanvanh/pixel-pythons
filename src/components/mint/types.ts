export interface Transactions {
  commitTxid: string;
  revealTxid: string;
  commitSigned: boolean;
  revealSigned: boolean;
  commitBroadcasted: boolean;
  revealBroadcasted: boolean;
}
