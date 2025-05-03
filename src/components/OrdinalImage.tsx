"use client";
import Image from "next/image";
import { useState } from "react";

export function OrdinalImage({
  src,
  alt,
  pendingTextClassName,
}: {
  src: string;
  alt: string;
  pendingTextClassName?: string;
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full h-full flex items-center justify-center bg-white relative">
      {!error ? (
        <Image
          src={src}
          alt={alt}
          width={400}
          height={400}
          className="w-full h-full object-contain"
          loading="lazy"
          unoptimized
          style={{ imageRendering: "pixelated" }}
          onError={() => setError(true)}
          onLoad={() => setLoading(false)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center w-full h-full bg-white">
          <span className={pendingTextClassName ?? "text-gray-500 text-center"}>
            Pending confirmation…
          </span>
        </div>
      )}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <span className="animate-spin h-6 w-6 border-4 border-blue-400 border-t-transparent rounded-full"></span>
        </div>
      )}
    </div>
  );
}
