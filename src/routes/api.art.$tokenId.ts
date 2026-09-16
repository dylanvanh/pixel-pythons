import { createFileRoute } from "@tanstack/react-router";
import { getArtSvg, parseTokenId } from "../lib/art";

export const Route = createFileRoute("/api/art/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const tokenId = parseTokenId(params.tokenId);

        if (tokenId === null) {
          return new Response("Invalid token ID", { status: 400 });
        }

        return new Response(await getArtSvg(tokenId), {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
