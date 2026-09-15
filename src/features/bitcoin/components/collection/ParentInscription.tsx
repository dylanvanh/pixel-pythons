interface ParentInscriptionProps {
  inscriptionId: string;
  text: string | null;
  hasError: boolean;
}

export function ParentInscription({ inscriptionId, text, hasError }: ParentInscriptionProps) {
  return (
    <a
      href={`https://ordiscan.com/inscription/${inscriptionId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="border-4 border-yellow-500 aspect-square w-48 h-48 shadow-lg bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-200 flex flex-col items-center justify-center relative cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(202,138,4,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(202,138,4,0.2)_1px,transparent_1px)] bg-[size:20px_20px]" />
      <div className="w-full h-full flex items-center justify-center relative backdrop-blur-[1px]">
        <span className="text-lg font-semibold text-center break-words px-2">
          {hasError ? "Error loading parent inscription" : (text ?? "Loading...")}
        </span>
      </div>
      <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded shadow">
        Parent Inscription
      </span>
    </a>
  );
}
