import { z } from "zod";

const environmentSchema = z.object({
  MEMPOOL_URL: z.string().url(),
  ORDISCAN_URL: z.string().url(),
  ORDISCAN_API_KEY: z.string().min(1),
  ORACLE_PRIVATE_KEY_WIF: z.string().min(1),
  ORACLE_COMPRESSED_PUBLIC_KEY: z.string().min(1),
  ORACLE_TAPROOT_ADDRESS: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_PARENT_INSCRIPTION_ID: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().min(1),
});

type Environment = z.infer<typeof environmentSchema>;

export const env: Environment = process.env.SKIP_ENV_VALIDATION
  ? (process.env as unknown as Environment)
  : environmentSchema.parse(process.env);
