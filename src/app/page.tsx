import { MintForm } from "@/components/mint/MintForm";
import { RecentMints } from "@/components/collection/RecentMints";
import { WalletInfo } from "@/components/WalletInfo";

// Revalidate the page every 5 seconds
export const revalidate = 5;

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto">
        <WalletInfo className="mb-4" />
        <MintForm />
        <RecentMints />
      </div>
    </main>
  );
}
