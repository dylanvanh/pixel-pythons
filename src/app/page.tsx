import { MintForm } from "@/components/mint/MintForm";
import { RecentMints } from "@/components/collection/RecentMints";
import { WalletInfo } from "@/components/WalletInfo";

// Revalidate the page every 5 seconds
export const revalidate = 5;

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="max-w-md w-full mx-auto">
          <WalletInfo className="mb-4" />
          <MintForm />
          <RecentMints />
        </div>
      </main>
    </div>
  );
}
