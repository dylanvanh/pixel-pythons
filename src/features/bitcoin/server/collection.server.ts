import { fetchInscriptions } from "../lib/supabase/fetch-inscriptions";

const PARENT_CONTENT_TIMEOUT_5_SECONDS_MS = 5000;

export async function getCollectionData(limit?: number) {
  const inscriptions = await fetchInscriptions(limit).catch(() => null);
  const parentId = process.env.NEXT_PUBLIC_PARENT_INSCRIPTION_ID || "";
  let parentText: string | null = null;

  if (parentId && !limit) {
    try {
      const response = await fetch(`https://ordinals.com/content/${parentId}`, {
        signal: AbortSignal.timeout(PARENT_CONTENT_TIMEOUT_5_SECONDS_MS),
      });
      if (response.ok) {
        parentText = await response.text();
      }
    } catch {
      /* The gallery can still display its database status. */
    }
  }

  return { inscriptions, parentId, parentText };
}
