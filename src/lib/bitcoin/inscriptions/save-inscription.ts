import { supabase } from "@/lib/supabase/config"; // Import the Supabase admin client

interface InscriptionRecordData {
  inscriptionId: string;
  revealTxid: string;
  commitTxid?: string;
  ordinalsAddress?: string;
}

export async function saveInscriptionRecord(
  recordData: InscriptionRecordData,
): Promise<void> {
  const { inscriptionId, revealTxid, commitTxid, ordinalsAddress } = recordData;
  const tableName = "inscriptions";

  try {
    const { error } = await supabase.from(tableName).insert({
      inscription_id: inscriptionId,
      reveal_txid: revealTxid,
      commit_txid: commitTxid,
      ordinals_address: ordinalsAddress,
    });

    if (error) {
      console.error("Error while writing to supabase", error);
    }
  } catch (error: unknown) {
    console.error(
      `Unexpected error saving inscription ${inscriptionId} to database:`,
      error,
    );
  }
}
