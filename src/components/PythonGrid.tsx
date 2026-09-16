import { getArtPath } from "../lib/art-url";

type PythonGridProps = {
  tokenIds: number[];
  isPreview?: boolean;
};

const TOKEN_LABEL_DIGITS = 3;

export function PythonGrid({ tokenIds, isPreview = false }: PythonGridProps) {
  return (
    <div className="python-grid">
      {tokenIds.map((tokenId) => (
        <a
          className="python-card"
          href={getArtPath(tokenId)}
          target="_blank"
          rel="noreferrer"
          key={tokenId}
          aria-label={`View ${isPreview ? "preview" : "Pixel Python"} #${tokenId}`}
        >
          <img
            src={getArtPath(tokenId)}
            width="240"
            height="240"
            alt={`Pixel Python ${isPreview ? "preview " : ""}#${tokenId}`}
            loading="lazy"
          />
          <span>
            <strong>PYTHON #{String(tokenId).padStart(TOKEN_LABEL_DIGITS, "0")}</strong>
            <span>{isPreview ? "PREVIEW" : "MINTED"}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
