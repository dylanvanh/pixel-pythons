import React from "react";

interface ParentInscriptionProps {
  inscriptionId: string;
  text: string | null;
  hasError: boolean;
}

export function ParentInscription({
  inscriptionId,
  text,
  hasError,
}: ParentInscriptionProps) {
  return (
    <a
      href={`https://ordiscan.com/inscription/${inscriptionId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="border-4 border-yellow-500 aspect-square w-48 h-48 shadow-lg bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-200 flex flex-col items-center justify-center relative cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 opacity-20">
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#grid)"
            className="text-yellow-600"
          />
        </svg>
      </div>
      <div className="w-full h-full flex items-center justify-center relative backdrop-blur-[1px]">
        <span className="text-lg font-semibold text-center break-words px-2">
          {hasError
            ? "Error loading parent inscription"
            : (text ?? "Loading...")}
        </span>
      </div>
      <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded shadow">
        Parent Inscription
      </span>
    </a>
  );
} 