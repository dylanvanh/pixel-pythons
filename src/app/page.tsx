import { MintForm } from "@/components/MintForm";
import { WalletInfo } from "@/components/WalletInfo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="max-w-md w-full mx-auto">
          <WalletInfo className="mb-4" />
          <MintForm />
        </div>
      </main>
    </div>
  );
}
