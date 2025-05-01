import { supabase } from "./config";

export async function getAndIncrementMintIndex(
  ordinalsAddress: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("get_and_increment_mint_index", {
    ordinals_address: ordinalsAddress,
  });
  if (error || typeof data !== "number") {
    throw new Error(
      `Failed to get mint index from Supabase: ${error?.message ?? "Unknown error"}`,
    );
  }
  return data;
}
