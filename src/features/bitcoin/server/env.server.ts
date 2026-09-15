import { z } from "zod";

const bitcoinEnvironmentSchema = z.object({
  MEMPOOL_URL: z.string().url(),
  ORDISCAN_URL: z.string().url(),
  ORDISCAN_API_KEY: z.string().min(1),
  ORACLE_PRIVATE_KEY_WIF: z.string().min(1),
  ORACLE_COMPRESSED_PUBLIC_KEY: z.string().min(1),
  ORACLE_TAPROOT_ADDRESS: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_PARENT_INSCRIPTION_ID: z.string().min(1),
});

export function getBitcoinEnv() {
  const result = bitcoinEnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error("Bitcoin services are not configured.");
  }

  return result.data;
}
