import { z } from "zod";

export const BroadcastRevealRequestSchema = z.object({
  signedPsbtBase64: z.string().min(50),
  commitTxid: z.string().min(64).max(64),
  ordinalsAddress: z.string().min(1),
});

export type BroadcastRevealRequest = z.infer<typeof BroadcastRevealRequestSchema>; 