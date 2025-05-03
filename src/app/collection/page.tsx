import Link from "next/link";
import { fetchInscriptions } from "@/lib/bitcoin/inscriptions/fetch-inscriptions";
import { OrdinalImage } from "@/components/OrdinalImage";
import { PARENT_INSCRIPTION_ID } from "@/lib/constants";
import axios from "axios";

// Revalidate the page every 5 seconds
export const revalidate = 5;

async function fetchParentInscriptionText(
  inscriptionId: string,
): Promise<string> {
  if (!inscriptionId) throw new Error("No inscription ID provided");
  const url = `https://ordiscan.com/content/${inscriptionId}`;
  const res = await axios.get(url);
  return res.data;
}

export default async function CollectionPage() {
  const inscriptions = await fetchInscriptions();

  let parentText: string | null = null;
  let parentTextError = false;
  if (PARENT_INSCRIPTION_ID) {
    try {
      parentText = await fetchParentInscriptionText(PARENT_INSCRIPTION_ID);
    } catch {
      parentTextError = true;
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex flex-col items-center py-12 px-4 bg-gradient-to-b from-white to-gray-100">
        <div className="max-w-6xl w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Collection Gallery</h2>
            <Link
              href="/"
              className="px-6 py-2 bg-blue-400 border-4 border-black font-bold hover:bg-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0)]"
            >
              Back to Mint
            </Link>
          </div>

          {PARENT_INSCRIPTION_ID && (
            <div className="mb-8 flex flex-col items-center">
              <a
                href={`https://ordiscan.com/inscription/${PARENT_INSCRIPTION_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-4 border-yellow-500 aspect-square w-48 h-48 shadow-lg bg-white flex flex-col items-center justify-center relative cursor-pointer"
              >
                <div className="w-full h-full flex items-center justify-center bg-white relative">
                  <span className="text-lg font-semibold text-center break-words px-2">
                    {parentTextError
                      ? "Error loading parent inscription"
                      : (parentText ?? "Loading...")}
                  </span>
                </div>
                <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded shadow">
                  Parent Inscription
                </span>
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {inscriptions.map((insc, idx) => {
              const image = (
                <OrdinalImage
                  src={`https://ordinals.com/content/${insc.inscription_id}`}
                  alt={`Ordinal ${insc.inscription_id}`}
                />
              );
              return (
                <div
                  key={insc.inscription_id}
                  className="border-4 border-black aspect-square shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200 bg-white relative flex flex-col items-center group cursor-pointer"
                >
                  <a
                    href={`https://ordiscan.com/inscription/${insc.inscription_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    tabIndex={0}
                  >
                    {image}
                  </a>
                  <span className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 rounded shadow">
                    #{inscriptions.length - idx}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
