import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  throw new Error("Server configuration error: Supabase URL is missing.");
}
if (!supabaseServiceRoleKey) {
  console.error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  throw new Error(
    "Server configuration error: Supabase Service Role Key is missing.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
