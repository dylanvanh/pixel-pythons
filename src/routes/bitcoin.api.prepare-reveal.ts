import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bitcoin/api/prepare-reveal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { POST } = await import("../features/bitcoin/server/prepare-reveal.server");
        return POST(request);
      },
    },
  },
});
