import { Link } from "@tanstack/react-router";
import { OrdinalImage } from "@/features/bitcoin/components/collection/OrdinalImage";
import { ParentInscription } from "@/features/bitcoin/components/collection/ParentInscription";

type BitcoinCollectionPageProps = {
  inscriptions: { inscription_id: string; created_at: string }[] | null;
  parentId: string;
  parentText: string | null;
};

export function BitcoinCollectionPage({
  inscriptions,
  parentId,
  parentText,
}: BitcoinCollectionPageProps) {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="max-w-6xl w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Collection Gallery</h2>
          <Link
            to="/bitcoin"
            className="px-6 py-2 bg-blue-400 border-4 border-black font-bold hover:bg-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0)]"
          >
            Back to Mint
          </Link>
        </div>

        {parentId && (
          <div className="mb-8 flex flex-col items-center">
            <ParentInscription inscriptionId={parentId} text={parentText} hasError={!parentText} />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {inscriptions === null && (
            <p>The Bitcoin collection could not be loaded. Try again later.</p>
          )}
          {inscriptions?.map((inscription, index) => (
            <div
              key={inscription.inscription_id}
              className="border-4 border-black aspect-square shadow-[5px_5px_0px_0px_rgba(0,0,0)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition-all duration-200 bg-white relative flex flex-col items-center group cursor-pointer"
            >
              <a
                href={`https://ordiscan.com/inscription/${inscription.inscription_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
                tabIndex={0}
              >
                <OrdinalImage
                  src={`https://ordinals.com/content/${inscription.inscription_id}`}
                  alt={`Ordinal ${inscription.inscription_id}`}
                />
              </a>
              <span className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 rounded shadow">
                #{inscriptions.length - index}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
