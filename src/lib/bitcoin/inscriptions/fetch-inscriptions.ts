import { supabase } from "@/lib/supabase/config";

export async function fetchInscriptions(amountToFetch?: number) {
  let query = supabase
    .from("inscriptions")
    .select("inscription_id, created_at")
    .order("created_at", { ascending: false });

  if (amountToFetch !== undefined) {
    query = query.limit(amountToFetch);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as { inscription_id: string; created_at: string }[];
}
