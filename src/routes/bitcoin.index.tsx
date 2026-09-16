import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { getRecentBitcoinMints } from "../features/bitcoin/collection";
import { RecentMints } from "../features/bitcoin/components/collection/RecentMints";

const BitcoinWalletPanel = lazy(() => import("../features/bitcoin/BitcoinWalletPanel"));

export const Route = createFileRoute("/bitcoin/")({
  loader: () => getRecentBitcoinMints(),
  component: BitcoinMint,
});

function BitcoinMint() {
  const { inscriptions } = Route.useLoaderData();

  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto">
        <ClientOnly fallback={<p>Loading Bitcoin wallets…</p>}>
          <Suspense fallback={<p>Loading Bitcoin wallets…</p>}>
            <BitcoinWalletPanel />
          </Suspense>
        </ClientOnly>
        <RecentMints recentMints={inscriptions} />
      </div>
    </main>
  );
}
