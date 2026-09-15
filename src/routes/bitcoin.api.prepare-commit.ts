import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/bitcoin/api/prepare-commit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { POST } = await import("../features/bitcoin/server/prepare-commit.server");
        return POST(request);
      },
    },
  },
});
