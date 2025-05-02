import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    MEMPOOL_URL: z.string().url(),
    ORDISCAN_URL: z.string().url(),
    ORDISCAN_API_KEY: z.string().min(1),
    ORACLE_PRIVATE_KEY_WIF: z.string().min(1),
    ORACLE_COMPRESSED_PUBLIC_KEY: z.string().min(1),
    ORACLE_TAPROOT_ADDRESS: z.string().min(1),
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_PARENT_INSCRIPTION_ID: z.string().min(1),
  },
  runtimeEnv: {
    MEMPOOL_URL: process.env.MEMPOOL_URL,
    ORDISCAN_URL: process.env.ORDISCAN_URL,
    ORDISCAN_API_KEY: process.env.ORDISCAN_API_KEY,
    ORACLE_PRIVATE_KEY_WIF: process.env.ORACLE_PRIVATE_KEY_WIF,
    ORACLE_COMPRESSED_PUBLIC_KEY: process.env.ORACLE_COMPRESSED_PUBLIC_KEY,
    ORACLE_TAPROOT_ADDRESS: process.env.ORACLE_TAPROOT_ADDRESS,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_PARENT_INSCRIPTION_ID:
      process.env.NEXT_PUBLIC_PARENT_INSCRIPTION_ID,
  },
});
