import { expect, test, vi } from "vite-plus/test";
import { postInternalApi } from "./internal-api-client";

test("Bitcoin API requests use the Bitcoin base path", async () => {
  // given
  const fetchApi = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetchApi);

  try {
    // when
    await postInternalApi("/api/prepare-commit", { amount: 1 });

    // then
    expect(fetchApi).toHaveBeenCalledWith(
      "/bitcoin/api/prepare-commit",
      expect.objectContaining({ method: "POST" }),
    );
  } finally {
    vi.unstubAllGlobals();
  }
});
