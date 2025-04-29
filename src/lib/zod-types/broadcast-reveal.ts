import { z } from "zod";

export const BroadcastRevealRequestSchema = z.object({
  signedPsbtBase64: z.string().min(50),
  commitTxid: z.string().min(64).max(64).optional(),
  ordinalsAddress: z.string().min(1).optional(),
});

export type BroadcastRevealRequest = z.infer<typeof BroadcastRevealRequestSchema>; 