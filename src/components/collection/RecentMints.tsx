import Link from "next/link";
import { fetchInscriptions } from "@/lib/supabase/fetch-inscriptions";
import { OrdinalImage } from "@/components/collection/OrdinalImage";

export async function RecentMints() {
  const recentMints = await fetchInscriptions(5);

  return (
    <div className="w-full mt-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Recently Minted</h3>
        <Link
          href="/collection"
          className="text-sm font-bold underline underline-offset-4 hover:bg-blue-300 px-2 py-1"
        >
          View All
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {recentMints.map((mint) => (
          <div
            key={mint.inscription_id}
            className="relative border-4 border-black aspect-square shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200 bg-white overflow-hidden min-w-0 min-h-0"
          >
            <a
              href={`https://ordiscan.com/inscription/${mint.inscription_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full min-w-0 min-h-0"
            >
              <OrdinalImage
                src={`https://ordinals.com/content/${mint.inscription_id}`}
                alt={`Ordinal ${mint.inscription_id}`}
                pendingTextClassName="text-[8px] leading-tight text-gray-500 text-center"
              />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
