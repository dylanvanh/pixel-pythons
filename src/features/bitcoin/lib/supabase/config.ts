import { getBitcoinEnv } from "@/features/bitcoin/server/env.server";
import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  return createClient(getBitcoinEnv().SUPABASE_URL, getBitcoinEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
