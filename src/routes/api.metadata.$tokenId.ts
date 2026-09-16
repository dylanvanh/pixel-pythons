import { createFileRoute } from "@tanstack/react-router";
import { getMetadata, parseTokenId } from "../lib/art";

export const Route = createFileRoute("/api/metadata/$tokenId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const tokenId = parseTokenId(params.tokenId);

        if (tokenId === null) {
          return new Response("Invalid token ID", { status: 400 });
        }

        return Response.json(await getMetadata(tokenId, new URL(request.url).origin), {
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
