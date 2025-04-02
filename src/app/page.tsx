import { MintForm } from "@/components/MintForm";
import { RecentMints } from "@/components/RecentMints";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="max-w-md w-full mx-auto">
          <MintForm />
          <RecentMints />
        </div>
      </main>

      {/* Disclaimer with GitHub link */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 p-1.5 text-center opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex justify-center items-center max-w-xl mx-auto">
          <p className="text-[10px] text-gray-600">Use at your own risk.</p>
          <div className="h-3 mx-3 border-r border-gray-300"></div>
          <a
            href="https://github.com/dylanvanh/ordinal-mint"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="GitHub"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
