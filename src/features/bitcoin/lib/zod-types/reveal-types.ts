import { z } from "zod";

export const PrepareRevealRequestSchema = z.object({
  commitTxid: z.string().min(64).max(64),
  ordinalsAddress: z.string().min(1),
  ordinalsPublicKey: z.string().min(1),
  paymentAddress: z.string().min(1),
  paymentPublicKey: z.string().min(1),
  sessionId: z
    .string()
    .regex(
      /^png2_[a-f0-9]{32}$/,
      "This commit uses an older PNG renderer. Complete it with the previous app.",
    ),
});

export type PrepareRevealRequest = z.infer<typeof PrepareRevealRequestSchema>;
