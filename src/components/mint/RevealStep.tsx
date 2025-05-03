import { Button } from "@/components/ui/button";
import { Transactions } from "./types";

interface RevealStepProps {
  isLoading: boolean;
  transactions: Transactions;
  ordinalAddress: string | null;
  signRevealTransaction: () => Promise<void>;
  resetMintProcess: () => void;
}

export function RevealStep({
  isLoading,
  transactions,
  ordinalAddress,
  signRevealTransaction,
  resetMintProcess,
}: RevealStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 border-4 border-black bg-white">
        <h3 className="text-lg font-bold mb-2">Commit Transaction</h3>
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="text-sm font-semibold">Signed ✓</span>
            {transactions.commitBroadcasted && (
              <span className="ml-4 text-sm font-semibold">Broadcasted ✓</span>
            )}
          </div>
          {transactions.commitSigned &&
            transactions.commitTxid &&
            !isLoading && (
              <div className="mt-2">
                <a
                  href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
                >
                  View transaction
                </a>
              </div>
            )}
        </div>
      </div>
      <div className="p-4 border-4 border-black bg-white">
        <h3 className="text-lg font-bold mb-2">Step 2: Reveal Transaction</h3>
        <p className="text-sm mb-2">
          Please sign the reveal transaction to finalize the mint.
        </p>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div className="bg-black h-full w-1/2 animate-pulse"></div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={signRevealTransaction}
          disabled={isLoading || !ordinalAddress}
          className="flex-1 bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
        >
          {isLoading ? "Signing..." : "Sign"}
        </Button>
        {transactions.revealSigned && transactions.revealTxid && !isLoading && (
          <a
            href={`https://ordiscan.com/tx/${transactions.revealTxid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 border-4 border-black font-bold text-black hover:bg-blue-300 transition-colors"
          >
            View TX
          </a>
        )}
        <Button
          onClick={resetMintProcess}
          disabled={isLoading}
          className="bg-white text-black border-4 border-black hover:bg-gray-100"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
